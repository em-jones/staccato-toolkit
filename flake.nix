{
  description = "garden-cli — pre-built binary package for the Garden development orchestrator";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  outputs = { self, nixpkgs }:
    let
      garden_version = "0.14.20";
      # Upstream release assets per platform
      src = {
        "x86_64-linux" = {
          url = "https://github.com/garden-io/garden/releases/download/${garden_version}/garden-${garden_version}-linux-amd64.tar.gz";
          hash = "sha256-g+FISR4Ay1yoMcrrQBo9G8XLjWa5chUK+WoSmreqxQU=";
          dir = "linux-amd64";
        };
        "aarch64-linux" = {
          url = "https://github.com/garden-io/garden/releases/download/${garden_version}/garden-${garden_version}-linux-arm64.tar.gz";
          hash = "sha256-ehlnl2JezQGxPHkICaj/0t58C2M2v/mQuNhbmNNC284=";
          dir = "linux-arm64";
        };
        "x86_64-darwin" = {
          url = "https://github.com/garden-io/garden/releases/download/${garden_version}/garden-${garden_version}-macos-amd64.tar.gz";
          hash = "sha256-b4ljBeJ9LtakT3ues4WFGu1WoH0EmD1Do+maYWdQGd4=";
          dir = "macos-amd64";
        };
        "aarch64-darwin" = {
          url = "https://github.com/garden-io/garden/releases/download/${garden_version}/garden-${garden_version}-macos-arm64.tar.gz";
          hash = "sha256-iXnkrpdj3p9W1lCPCLDnCXMaGlonzJIu8QQVWF5zDk4=";
          dir = "macos-arm64";
        };
      };

      forAllSystems = f: nixpkgs.lib.genAttrs (builtins.attrNames src) f;

      pkgFor = system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          meta = src.${system};
        in
        pkgs.stdenv.mkDerivation {
          pname = "garden-cli";
          version = garden_version;

          src = pkgs.fetchurl {
            url = meta.url;
            hash = meta.hash;
          };

          # The tarball unpacks to e.g. linux-amd64/garden
          sourceRoot = meta.dir;

          nativeBuildInputs = pkgs.lib.optionals pkgs.stdenv.isLinux [
            pkgs.autoPatchelfHook
          ];

          # garden is a Node.js SEA binary; it dynamically loads libstdc++ on Linux
          buildInputs = pkgs.lib.optionals pkgs.stdenv.isLinux [
            pkgs.stdenv.cc.cc.lib
          ];

          installPhase = ''
            install -Dm755 garden $out/bin/garden
          '';

          meta = with pkgs.lib; {
            description = "Garden — Kubernetes development orchestrator (Cedar ${garden_version})";
            homepage = "https://garden.io";
            license = licenses.mpl20;
            platforms = builtins.attrNames src;
            mainProgram = "garden";
          };
        };
    in
    {
      packages = forAllSystems (system: {
        garden-cli = pkgFor system;
        default = pkgFor system;
      });
    };
}
