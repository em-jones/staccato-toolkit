package main

import (
	"bytes"
	"testing"
)

func TestHelloCommand(t *testing.T) {
	rootCmd := newRootCmd()
	buf := new(bytes.Buffer)
	rootCmd.SetOut(buf)

	rootCmd.SetArgs([]string{"hello"})
	if err := rootCmd.Execute(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got := buf.String()
	want := "Hello, World!\n"
	if got != want {
		t.Errorf("hello output = %q; want %q", got, want)
	}
}

func TestRootCommandHelp(t *testing.T) {
	rootCmd := newRootCmd()
	buf := new(bytes.Buffer)
	rootCmd.SetOut(buf)

	rootCmd.SetArgs([]string{"--help"})
	if err := rootCmd.Execute(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestUnknownCommandError(t *testing.T) {
	rootCmd := newRootCmd()
	rootCmd.SetArgs([]string{"bogus"})
	err := rootCmd.Execute()
	if err == nil {
		t.Error("expected error for unknown command, got nil")
	}
}
