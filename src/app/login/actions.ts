"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";

export interface EstadoLogin {
  error?: string;
}

export async function iniciarSesion(
  _previo: EstadoLogin,
  formData: FormData,
): Promise<EstadoLogin> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof CredentialsSignin && error.code === "cuenta_bloqueada") {
      return { error: "Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo más tarde." };
    }
    if (error instanceof AuthError) {
      return { error: "Correo o contraseña incorrectos." };
    }
    throw error; // incluye la redirección de un inicio de sesión correcto
  }
}
