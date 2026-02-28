import { SignJWT } from "jose";

async function run() {
  const secret = new TextEncoder().encode("change-this-to-a-strong-random-secret-key");
  const token = await new SignJWT({ role: "admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(secret);
        
  const res = await fetch('http://localhost:3000/api/admin/media?id=a1', {
    method: 'DELETE',
    headers: {
      'Cookie': `admin_session=${token}`
    }
  });
  
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}
run();
