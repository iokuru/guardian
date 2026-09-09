import { apiRequest } from "./client";
export interface LoginRequest { username: string; password: string; }
export interface User { id: number; username: string; email: string; role: string; }
export interface LoginResponse { access_token: string; token_type: string; }
export async function login(data: LoginRequest): Promise<LoginResponse> { return apiRequest("/auth/login", { method: "POST", body: JSON.stringify(data) }); }
export async function getCurrentUser(): Promise<User> { return apiRequest("/auth/me"); }
