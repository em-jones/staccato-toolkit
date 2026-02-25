package core

type Capability interface {
	// Adopt is called when the capability is adopted by a component.
	// It should perform any necessary setup and return an error if the adoption fails.
	Adopt() error
	DependsOn() []Capability
}
