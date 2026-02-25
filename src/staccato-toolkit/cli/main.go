package main

import (
	"os"

	"github.com/spf13/cobra"
)

func main() {
	if err := newRootCmd().Execute(); err != nil {
		os.Exit(1)
	}
}

func newRootCmd() *cobra.Command {
	rootCmd := &cobra.Command{
		Use:   "staccato",
		Short: "The staccato toolkit CLI",
		Long:  "staccato is a command-line interface for the staccato toolkit platform.",
	}

	rootCmd.AddCommand(newHelloCmd())
	rootCmd.AddCommand(newBootstrapCmd())

	return rootCmd
}

func newHelloCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "hello",
		Short: "Print a greeting",
		Long:  "Print a friendly greeting to demonstrate the CLI is working.",
		RunE: func(cmd *cobra.Command, args []string) error {
			cmd.Println("Hello, World!")
			return nil
		},
	}
}
