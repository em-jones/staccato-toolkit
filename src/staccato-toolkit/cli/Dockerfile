# Stage 1: Build
FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /staccato-cli .

# Stage 2: Runtime
FROM gcr.io/distroless/static:nonroot
COPY --from=builder /staccato-cli /staccato-cli
USER nonroot:nonroot
CMD ["staccato-cli"]
