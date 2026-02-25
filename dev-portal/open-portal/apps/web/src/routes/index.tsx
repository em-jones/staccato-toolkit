import { createFileRoute } from "@tanstack/solid-router";
import Home from "../pages/home.tsx";

export const Route = createFileRoute("/")({ component: Home });
