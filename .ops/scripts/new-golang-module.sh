#!/usr/bin/env bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")/.."
TEMPLATE_DIR="${PROJECT_ROOT}/.templates/golang-module"

# Default values
ORG="staccato-toolkit"
INCLUDE_DEFAULTS=true
MODULE_NAME=""

# Function to print colored output
print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1" >&2
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1" >&2
}

print_info() {
  echo -e "${YELLOW}→${NC} $1"
}

# Function to display help
show_help() {
  cat << EOF
Create a new Go module within the staccato-toolkit workspace.

USAGE:
  bash build/new-golang-module.sh [OPTIONS] MODULE_NAME

REQUIRED:
  MODULE_NAME       Name of the new module (alphanumeric, hyphens, underscores)

OPTIONS:
  -o, --org ORG     Organization name (default: staccato-toolkit)
  --no-defaults     Skip service defaults and telemetry dependencies
  -h, --help        Display this help message

EXAMPLES:
  bash build/new-golang-module.sh myservice
  bash build/new-golang-module.sh -o myorg myservice
  bash build/new-golang-module.sh --no-defaults simple-service

EOF
}

# Function to validate module name
validate_module_name() {
  local name=$1
  
  if [[ ! "$name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    print_error "Invalid module name: '$name'"
    echo "Module name must contain only alphanumeric characters, hyphens, and underscores." >&2
    return 1
  fi
  
  return 0
}

# Function to convert module name to service name (snake_case to camelCase)
to_service_name() {
  local name=$1
  # Convert hyphens and underscores to spaces, then capitalize each word
  local service_name=$(echo "$name" | sed 's/[-_]/ /g' | awk '{for(i=1;i<=NF;i++)$i=toupper(substr($i,1,1))tolower(substr($i,2))}1' | tr -d ' ')
  echo "$service_name"
}

# Function to check if directory exists
check_directory_exists() {
  local dir=$1
  
  if [[ -d "$dir" ]]; then
    print_error "Directory already exists: $dir"
    echo "Please choose a different module name or organization." >&2
    return 1
  fi
  
  return 0
}

# Function to create module directory
create_module_directory() {
  local dir=$1
  
  if ! mkdir -p "$dir" 2>/dev/null; then
    print_error "Failed to create directory: $dir"
    echo "Check your permissions and try again." >&2
    return 1
  fi
  
  return 0
}

# Function to process and copy template files
copy_and_process_template() {
  local template_file=$1
  local target_file=$2
  local service_name=$3
  
  if [[ ! -f "$template_file" ]]; then
    print_error "Template file not found: $template_file"
    return 1
  fi
  
  # Read template content
  local content=$(cat "$template_file")
  
  # Replace placeholders using sed
  content=$(echo "$content" | sed "s/\${ORG}/$ORG/g")
  content=$(echo "$content" | sed "s/\${MODULE_NAME}/$MODULE_NAME/g")
  content=$(echo "$content" | sed "s/\${SERVICE_NAME}/$service_name/g")
  
  # Write to target
  if ! echo "$content" > "$target_file" 2>/dev/null; then
    print_error "Failed to write file: $target_file"
    return 1
  fi
  
  return 0
}

# Function to update go.work
update_go_work() {
  local module_path="./src/${ORG}/${MODULE_NAME}"
  
  # Change to project root to run go work use
  cd "$PROJECT_ROOT" || return 1
  
  if ! go work use "$module_path" 2>/dev/null; then
    print_warning "Failed to add module to go.work. You may need to run this manually:"
    echo "  cd $PROJECT_ROOT && go work use $module_path" >&2
    return 0  # Return success anyway (warn and continue)
  fi
  
  return 0
}

# Function to tidy go.mod
tidy_go_mod() {
  local module_dir="${PROJECT_ROOT}/src/${ORG}/${MODULE_NAME}"
  
  cd "$module_dir" || return 1
  
  if ! go mod tidy 2>/dev/null; then
    print_warning "Failed to run 'go mod tidy'. You may need to run this manually:"
    echo "  cd $module_dir && go mod tidy" >&2
    return 0  # Return success anyway (warn and continue)
  fi
  
  return 0
}

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      exit 0
      ;;
    -o|--org)
      ORG="$2"
      shift 2
      ;;
    --no-defaults)
      INCLUDE_DEFAULTS=false
      shift
      ;;
    -*)
      print_error "Unknown option: $1"
      echo "" >&2
      show_help >&2
      exit 1
      ;;
    *)
      if [[ -z "$MODULE_NAME" ]]; then
        MODULE_NAME="$1"
        shift
      else
        print_error "Multiple module names provided"
        echo "Only one MODULE_NAME is allowed." >&2
        exit 1
      fi
      ;;
  esac
done

# Validate that module name was provided
if [[ -z "$MODULE_NAME" ]]; then
  print_error "MODULE_NAME is required"
  echo "" >&2
  show_help >&2
  exit 1
fi

# Validate module name format
if ! validate_module_name "$MODULE_NAME"; then
  echo "" >&2
  show_help >&2
  exit 1
fi

# Check if template directory exists
if [[ ! -d "$TEMPLATE_DIR" ]]; then
  print_error "Template directory not found: $TEMPLATE_DIR"
  exit 1
fi

# Calculate paths and service name
SERVICE_NAME=$(to_service_name "$MODULE_NAME")
MODULE_DIR="${PROJECT_ROOT}/src/${ORG}/${MODULE_NAME}"

print_info "Creating Go module: ${ORG}/${MODULE_NAME}"

# Check if directory already exists
if ! check_directory_exists "$MODULE_DIR"; then
  exit 1
fi

# Create module directory
if ! create_module_directory "$MODULE_DIR"; then
  exit 1
fi

print_success "Directory created: src/${ORG}/${MODULE_NAME}"

# Copy template files
print_info "Processing template files..."

# Copy go.sum (no processing needed)
if ! cp "${TEMPLATE_DIR}/go.sum" "${MODULE_DIR}/go.sum" 2>/dev/null; then
  print_error "Failed to copy go.sum"
  exit 1
fi

# Copy go.mod (with variable substitution)
if ! copy_and_process_template "${TEMPLATE_DIR}/go.mod" "${MODULE_DIR}/go.mod" "$SERVICE_NAME"; then
  exit 1
fi

# Handle --no-defaults: strip dependencies from go.mod
if [[ "$INCLUDE_DEFAULTS" == false ]]; then
  # Create minimal go.mod without dependencies
  cat > "${MODULE_DIR}/go.mod" << EOF
module github.com/${ORG}/${MODULE_NAME}

go 1.25.4
EOF
  print_success "go.mod created (without service defaults)"
else
  print_success "go.mod created (with service defaults)"
fi

# Copy main.go (select correct variant)
if [[ "$INCLUDE_DEFAULTS" == true ]]; then
  if ! copy_and_process_template "${TEMPLATE_DIR}/main.go" "${MODULE_DIR}/main.go" "$SERVICE_NAME"; then
    exit 1
  fi
  print_success "main.go created (with service defaults)"
else
  if ! copy_and_process_template "${TEMPLATE_DIR}/main.go.no-defaults" "${MODULE_DIR}/main.go" "$SERVICE_NAME"; then
    exit 1
  fi
  print_success "main.go created (without service defaults)"
fi

# Copy main_test.go
if ! copy_and_process_template "${TEMPLATE_DIR}/main_test.go" "${MODULE_DIR}/main_test.go" "$SERVICE_NAME"; then
  exit 1
fi
print_success "main_test.go created"

# Copy README.md
if ! copy_and_process_template "${TEMPLATE_DIR}/README.md" "${MODULE_DIR}/README.md" "$SERVICE_NAME"; then
  exit 1
fi
print_success "README.md created"

# Copy .gitignore
if ! cp "${TEMPLATE_DIR}/.gitignore" "${MODULE_DIR}/.gitignore" 2>/dev/null; then
  print_error "Failed to copy .gitignore"
  exit 1
fi
print_success ".gitignore created"

# Update go.work
print_info "Updating go.work..."
if ! update_go_work; then
  exit 1
fi
print_success "go.work updated"

# Tidy go.mod
print_info "Running 'go mod tidy'..."
if ! tidy_go_mod; then
  exit 1
fi
print_success "Dependencies tidied"

# Print summary
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
print_success "Module created successfully!"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "Module location: src/${ORG}/${MODULE_NAME}/"
echo ""
echo "Next steps:"
echo "  1. cd src/${ORG}/${MODULE_NAME}/"
echo "  2. Edit main.go to add your service logic"
echo "  3. Run tests: go test ./..."
echo ""
