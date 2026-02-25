package main

import (
	"log"
	"net/http"
	"os"

	"github.com/maxence-charriere/go-app/v10/pkg/app"
)

// Hello is a component that displays "Hello, PWA World!" with a click counter.
// It embeds app.Compo to satisfy the app.Composer interface.
type Hello struct {
	app.Compo
	count int
}

// Render returns the component's HTML structure.
func (h *Hello) Render() app.UI {
	return app.Div().Body(
		app.H1().Text("Hello, PWA World!"),
		app.P().Body(
			app.Text("Button clicked: "),
			app.B().Textf("%d times", h.count),
		),
		app.Button().
			Text("Click me").
			OnClick(h.onClick),
	)
}

// onClick increments the counter and schedules a re-render via ctx.Dispatch.
func (h *Hello) onClick(ctx app.Context, e app.Event) {
	ctx.Dispatch(func(ctx app.Context) {
		h.count++
	})
}

func main() {
	// Register component routing. This code runs in both the server (no-op)
	// and the WASM client (activates routing in the browser).
	app.Route("/", func() app.Composer { return &Hello{} })
	app.RunWhenOnBrowser() // Blocks forever in WASM; no-op on native server.

	// Server-side: configure and start the HTTP server.
	// app.Handler auto-generates: HTML shell, PWA manifest, service worker, WASM loader.
	http.Handle("/", &app.Handler{
		Name:        "Staccato Web",
		Description: "Staccato toolkit web interface",
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	addr := ":" + port
	log.Printf("Listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}
