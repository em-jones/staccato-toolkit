package environments

// Two primary types of environments:
// 1. Ops - centralized, used for ci/cd and infrastructure as code
// 2. Workloads - decentralized, used for applications and services

type OpsEnvironment interface {
	Init()
	Update()
}

type WorkloadEnvironment interface {
	Provision()
	Update()
}
