package environments

type OpsEnvironmentProvider interface {
	Exec() error
}

type AwsOpsEnvironment struct{}

type LocalOpsEnvironment struct{}

func (e *AwsOpsEnvironment) Provision() {}
func (e *AwsOpsEnvironment) Update()    {}

func (e *LocalOpsEnvironment) Provision() {}
func (e *LocalOpsEnvironment) Update()    {}
