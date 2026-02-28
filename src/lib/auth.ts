import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function verifyAdmin(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_session")?.value;

        if (!token) return false;

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) return false;

        const secret = new TextEncoder().encode(jwtSecret);

        const { payload } = await jwtVerify(token, secret);
        return payload.role === "admin";
    } catch {
        return false;
    }
}

export function unauthorizedResponse() {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
}
