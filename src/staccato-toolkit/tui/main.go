package main

import (
	"context"
	"log/slog"
	"os"

	tea "charm.land/bubbletea/v2"
	"github.com/staccato-toolkit/core/pkg/servicedefaults"
)

// model holds the application state.
type model struct {
	greeting string
}

// Init runs on program start. Returns nil (no initial command).
func (m model) Init() tea.Cmd {
	return nil
}

// Update handles messages and returns updated model and optional command.
func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyPressMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit
		}
	}
	return m, nil
}

// View renders the current model state.
func (m model) View() tea.View {
	return tea.NewView(m.greeting + "\n\nPress q to quit.\n")
}

func main() {
	ctx := context.Background()

	// Redirect slog's stdout JSON handler to stderr before the TUI takes over stdout.
	// The OTLP gRPC log export path (via otelslog bridge) is unaffected — it never touches stdout.
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stderr, nil)))

	shutdown, err := servicedefaults.Configure(ctx, "Tui")
	if err != nil {
		slog.Error("failed to configure service defaults", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			slog.Error("failed to shutdown service defaults", "error", err)
		}
	}()

	slog.Info("Tui starting")

	m := model{greeting: "Hello, World!"}
	p := tea.NewProgram(m)
	if _, err := p.Run(); err != nil {
		slog.Error("TUI error", "error", err)
		os.Exit(1)
	}
}
