# Stage 1: Build
FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /staccato-server .

# Stage 2: Runtime
FROM gcr.io/distroless/static:nonroot
COPY --from=builder /staccato-server /staccato-server
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/staccato-server"]
