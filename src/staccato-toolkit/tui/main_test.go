package main

import (
	"strings"
	"testing"

	tea "charm.land/bubbletea/v2"
)

func TestModelInit(t *testing.T) {
	m := model{greeting: "Hello, World!"}
	cmd := m.Init()
	if cmd != nil {
		t.Error("Init() should return nil command for hello-world model")
	}
}

func TestModelView(t *testing.T) {
	m := model{greeting: "Hello, World!"}
	view := m.View()
	if !strings.Contains(view.Content, "Hello, World!") {
		t.Errorf("View().Content = %q; want to contain 'Hello, World!'", view.Content)
	}
}

func TestModelUpdateQuitKey(t *testing.T) {
	m := model{greeting: "Hello, World!"}
	_, cmd := m.Update(tea.KeyPressMsg{Code: 'q'})
	if cmd == nil {
		t.Error("Update() with 'q' should return a non-nil quit command")
	}
}

func TestModelUpdateNoOp(t *testing.T) {
	m := model{greeting: "Hello, World!"}
	updated, cmd := m.Update(tea.KeyPressMsg{Code: 'x'})
	if cmd != nil {
		t.Error("Update() with non-quit key should return nil command")
	}
	updatedModel, ok := updated.(model)
	if !ok {
		t.Fatal("Update() should return a model")
	}
	if updatedModel.greeting != m.greeting {
		t.Error("Update() with non-quit key should not change greeting")
	}
}
