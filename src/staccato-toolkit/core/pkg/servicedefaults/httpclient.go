package servicedefaults

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

var (
	// serviceName holds the current service name, set by Configure()
	serviceName = "unknown"
	// serviceVersion holds the current service version
	serviceVersion = "dev"
)

// setServiceInfo updates the package-level service name and version.
// Called by Configure() to enable User-Agent header generation.
func setServiceInfo(name, version string) {
	serviceName = name
	serviceVersion = version
}

// ClientOption is a functional option for NewHTTPClient
type ClientOption func(*clientConfig)

// clientConfig holds HTTP client configuration
type clientConfig struct {
	timeout    time.Duration
	maxRetries int
	backoff    time.Duration
	tlsConfig  *tls.Config
	userAgent  string
}

// defaultClientConfig returns the default HTTP client configuration
func defaultClientConfig() *clientConfig {
	return &clientConfig{
		timeout:    30 * time.Second,
		maxRetries: 0,
		backoff:    0,
		tlsConfig:  nil,
		userAgent:  "",
	}
}

// WithTimeout sets the HTTP client timeout (default: 30s)
func WithTimeout(d time.Duration) ClientOption {
	return func(c *clientConfig) {
		c.timeout = d
	}
}

// WithRetry configures retry behavior for transient failures
func WithRetry(maxRetries int, backoff time.Duration) ClientOption {
	return func(c *clientConfig) {
		c.maxRetries = maxRetries
		c.backoff = backoff
	}
}

// WithTLSConfig sets a custom TLS configuration
func WithTLSConfig(cfg *tls.Config) ClientOption {
	return func(c *clientConfig) {
		c.tlsConfig = cfg
	}
}

// NewHTTPClient returns an *http.Client with OTel transport instrumentation
// and configurable options. The transport automatically creates spans for
// outbound HTTP calls and propagates W3C TraceContext headers.
func NewHTTPClient(opts ...ClientOption) *http.Client {
	cfg := defaultClientConfig()
	for _, opt := range opts {
		opt(cfg)
	}

	// Build the base transport
	baseTransport := http.DefaultTransport.(*http.Transport).Clone()

	// Apply TLS config if provided
	if cfg.tlsConfig != nil {
		baseTransport.TLSClientConfig = cfg.tlsConfig
	}

	// Wrap with OTel instrumentation
	var transport http.RoundTripper = otelhttp.NewTransport(baseTransport)

	// Wrap with retry logic if configured
	if cfg.maxRetries > 0 {
		transport = &retryTransport{
			base:       transport,
			maxRetries: cfg.maxRetries,
			backoff:    cfg.backoff,
		}
	}

	// Determine User-Agent to use
	userAgent := cfg.userAgent
	if userAgent == "" {
		// Use default format: staccato-toolkit/<service-name>/<version>
		userAgent = fmt.Sprintf("staccato-toolkit/%s/%s", serviceName, serviceVersion)
	}

	// Always wrap with User-Agent transport
	transport = &userAgentTransport{
		base:      transport,
		userAgent: userAgent,
	}

	return &http.Client{
		Timeout:   cfg.timeout,
		Transport: transport,
	}
}

// retryTransport wraps an http.RoundTripper with retry logic for transient failures
type retryTransport struct {
	base       http.RoundTripper
	maxRetries int
	backoff    time.Duration
}

// RoundTrip implements http.RoundTripper
func (rt *retryTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	var resp *http.Response
	var err error

	for attempt := 0; attempt <= rt.maxRetries; attempt++ {
		if attempt > 0 {
			// Wait before retrying
			time.Sleep(rt.backoff)
		}

		resp, err = rt.base.RoundTrip(req)

		// Success case
		if err == nil && resp.StatusCode < 500 {
			return resp, nil
		}

		// Don't retry on client errors (4xx)
		if err == nil && resp.StatusCode >= 400 && resp.StatusCode < 500 {
			return resp, nil
		}

		// If this is the last attempt, return whatever we got
		if attempt == rt.maxRetries {
			return resp, err
		}

		// Close the response body before retrying to avoid resource leaks
		if resp != nil && resp.Body != nil {
			resp.Body.Close()
		}
	}

	return resp, err
}

// userAgentTransport wraps an http.RoundTripper to add a User-Agent header
type userAgentTransport struct {
	base      http.RoundTripper
	userAgent string
}

// RoundTrip implements http.RoundTripper
func (uat *userAgentTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	// Clone the request to avoid modifying the original
	req2 := req.Clone(req.Context())

	// Set User-Agent header if not already set
	if req2.Header.Get("User-Agent") == "" {
		req2.Header.Set("User-Agent", uat.userAgent)
	}

	return uat.base.RoundTrip(req2)
}
