package main

import (
	"fmt"
	"os"

	"github.com/pulumi/pulumi-cloudflare/sdk/v6/go/cloudflare"
	"github.com/pulumi/pulumi-digitalocean/sdk/v8/go/digitalocean"
	"github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes"
	metav1 "github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes/apis/meta/v1"
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes/core/v1"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		doToken := pulumi.NewSecretConfig("do_token")
		cfToken := pulumi.NewSecretConfig("cf_token")
		cfZoneID := pulumi.Config("cf").Require("cf_zone_id")
		clusterName := pulumi.Config("cf").Get("cluster_name", "my-cluster")
		clusterRegion := pulumi.Config("cf").Get("cluster_region", "nyc1")
		clusterVersion := pulumi.Config("cf").Get("cluster_version", "1.30")
		clusterNodeCount := pulumi.Config("cf").GetInt("cluster_node_count", 2)
		clusterNodeSize := pulumi.Config("cf").Get("cluster_node_size", "s-2vcpu-2gb")
		domainName := pulumi.Config("cf").Require("domain")

		cluster, err := digitalocean.NewKubernetesCluster(ctx, clusterName, &digitalocean.KubernetesClusterArgs{
			Name:    pulumi.String(clusterName),
			Region:  pulumi.String(clusterRegion),
			Version: pulumi.String(clusterVersion),
			NodePool: &digitalocean.KubernetesClusterNodePoolArgs{
				Name:      pulumi.String("default"),
				Size:      pulumi.String(clusterNodeSize),
				NodeCount: pulumi.Int(clusterNodeCount),
			},
		}, pulumi.ProviderArgs{
			Token: doToken,
		})
		if err != nil {
			return fmt.Errorf("error creating cluster: %w", err)
		}

		kubeconfig := cluster.KubeConfigRaw

		k8sProvider, err := kubernetes.NewProvider(ctx, "k8s-provider", &kubernetes.ProviderArgs{
			Kubeconfig: kubeconfig,
		}, pulumi.DependsOn([]pulumi.Resource{cluster}))
		if err != nil {
			return fmt.Errorf("error creating k8s provider: %w", err)
		}

		_, err = corev1.NewNamespace(ctx, "default", &corev1.NamespaceArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Name: pulumi.String("default"),
			},
		}, pulumi.Provider(k8sProvider))
		if err != nil {
			return fmt.Errorf("error creating namespace: %w", err)
		}

		lbService, err := corev1.NewService(ctx, "ingress-nginx", &corev1.ServiceArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Name: pulumi.String("ingress-nginx"),
				Annotations: pulumi.Map{
					"service.beta.kubernetes.io/do-loadbalancer-enable-proxy-protocol": pulumi.String("true"),
				},
			},
			Spec: &corev1.ServiceSpecArgs{
				Type: pulumi.String("LoadBalancer"),
				Selector: pulumi.Map{
					"app": pulumi.String("ingress-nginx"),
				},
				Ports: &corev1.ServicePortArgs{
					Name:       pulumi.String("http"),
					Port:       pulumi.Int(80),
					TargetPort: pulumi.String("http"),
				},
			},
		}, pulumi.Provider(k8sProvider))
		if err != nil {
			return fmt.Errorf("error creating LB service: %w", err)
		}

		lbIP := lbService.Status.ApplyT(func(status *corev1.ServiceStatus) string {
			if status == nil || status.LoadBalancer == nil || len(status.LoadBalancer.Ingress) == 0 {
				return ""
			}
			return status.LoadBalancer.Ingress[0].IP
		}).(pulumi.StringOutput)

		cfProvider, err := cloudflare.NewProvider(ctx, "cf-provider", &cloudflare.ProviderArgs{
			ApiToken: cfToken,
		})
		if err != nil {
			return fmt.Errorf("error creating cf provider: %w", err)
		}

		_, err = cloudflare.NewRecord(ctx, "lb-record", &cloudflare.RecordArgs{
			ZoneId:  pulumi.String(cfZoneID),
			Name:    pulumi.String("@"),
			Value:   lbIP,
			Type:    pulumi.String("A"),
			Proxied: pulumi.Bool(true),
		}, pulumi.Provider(cfProvider))
		if err != nil {
			return fmt.Errorf("error creating CF record: %w", err)
		}

		ctx.Export("cluster-name", pulumi.String(clusterName))
		ctx.Export("cluster-region", pulumi.String(clusterRegion))
		ctx.Export("cluster-version", pulumi.String(clusterVersion))
		ctx.Export("cluster-endpoint", cluster.Endpoint)
		ctx.Export("cluster-kubeconfig", kubeconfig)
		ctx.Export("loadbalancer-ip", lbIP)

		fmt.Printf("Cluster %s created in %s\n", clusterName, clusterRegion)
		fmt.Printf("Domain: %s\n", domainName)

		return nil
	})
}

func init() {
	if err := os.Setenv("PULUMI_DISABLE_LOGGING", "0"); err != nil {
		panic(err)
	}
}
