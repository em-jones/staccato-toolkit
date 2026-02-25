package main

import (
	"testing"

	"github.com/maxence-charriere/go-app/v10/pkg/app"
)

func TestHelloRender(t *testing.T) {
	h := &Hello{}
	ui := h.Render()
	if ui == nil {
		t.Fatal("Render() returned nil")
	}
}

func TestHelloInitialCount(t *testing.T) {
	h := &Hello{}
	if h.count != 0 {
		t.Errorf("initial count = %d; want 0", h.count)
	}
}

func TestHelloImplementsComposer(t *testing.T) {
	// Compile-time check: *Hello must implement app.Composer.
	var _ app.Composer = (*Hello)(nil)
}
