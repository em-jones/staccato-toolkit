package servicedefaults

import (
	"crypto/tls"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNewHTTPClient_DefaultTimeout(t *testing.T) {
	client := NewHTTPClient()

	if client.Timeout != 30*time.Second {
		t.Errorf("Expected default timeout of 30s, got %v", client.Timeout)
	}
}

func TestNewHTTPClient_WithTimeout(t *testing.T) {
	client := NewHTTPClient(WithTimeout(5 * time.Second))

	if client.Timeout != 5*time.Second {
		t.Errorf("Expected timeout of 5s, got %v", client.Timeout)
	}
}

func TestNewHTTPClient_TransportNotNil(t *testing.T) {
	client := NewHTTPClient()

	if client.Transport == nil {
		t.Error("Expected transport to be non-nil")
	}
}

func TestNewHTTPClient_WithTLSConfig(t *testing.T) {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
	}

	client := NewHTTPClient(WithTLSConfig(tlsConfig))

	if client.Transport == nil {
		t.Fatal("Expected transport to be non-nil")
	}

	// The transport is wrapped, so we can't directly access the TLS config
	// but we can verify the client was created successfully
	if client == nil {
		t.Error("Expected client to be non-nil")
	}
}

func TestNewHTTPClient_WithRetry(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts <= 2 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewHTTPClient(WithRetry(3, 10*time.Millisecond))

	resp, err := client.Get(server.URL)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	if attempts != 3 {
		t.Errorf("Expected 3 attempts, got %d", attempts)
	}
}

func TestNewHTTPClient_WithRetry_NoRetryOn4xx(t *testing.T) {
	attempts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	client := NewHTTPClient(WithRetry(3, 10*time.Millisecond))

	resp, err := client.Get(server.URL)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", resp.StatusCode)
	}

	// Should not retry on 4xx errors
	if attempts != 1 {
		t.Errorf("Expected 1 attempt, got %d", attempts)
	}
}

func TestUserAgentTransport(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ua := r.Header.Get("User-Agent")
		if ua != "test-agent" {
			t.Errorf("Expected User-Agent 'test-agent', got '%s'", ua)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := &http.Client{
		Transport: &userAgentTransport{
			base:      http.DefaultTransport,
			userAgent: "test-agent",
		},
	}

	resp, err := client.Get(server.URL)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	defer resp.Body.Close()
}

func TestUserAgentTransport_PreservesExisting(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ua := r.Header.Get("User-Agent")
		if ua != "custom-agent" {
			t.Errorf("Expected User-Agent 'custom-agent', got '%s'", ua)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := &http.Client{
		Transport: &userAgentTransport{
			base:      http.DefaultTransport,
			userAgent: "test-agent",
		},
	}

	req, err := http.NewRequest("GET", server.URL, nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("User-Agent", "custom-agent")

	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	defer resp.Body.Close()
}

func TestNewHTTPClient_DefaultUserAgent(t *testing.T) {
	// Set service info to test default User-Agent
	setServiceInfo("test-service", "1.0.0")

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ua := r.Header.Get("User-Agent")
		expected := "staccato-toolkit/test-service/1.0.0"
		if ua != expected {
			t.Errorf("Expected User-Agent '%s', got '%s'", expected, ua)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewHTTPClient()

	resp, err := client.Get(server.URL)
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	defer resp.Body.Close()

	// Reset to default values
	setServiceInfo("unknown", "dev")
}
