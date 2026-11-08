import { createClient } from "@supabase/supabase-js";

const [command, suppliedEmail] = process.argv.slice(2);
if (command === "--help" || !command) {
  console.log("Uso: node --env-file=.env.admin.local scripts/auth-admin.mjs <create|reset-password> <correo-aprobado>");
  console.log("Variables locales: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY y SUPABASE_NEW_PASSWORD.");
  process.exit(0);
}

const email = suppliedEmail?.trim().toLowerCase();
if (!["create", "reset-password"].includes(command) || !email || !/^[^\s@]+@unbosque\.edu\.co$/.test(email)) {
  console.error("Indica una operación válida y el correo institucional previamente aprobado.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const password = process.env.SUPABASE_NEW_PASSWORD;
if (!url || !secret || !password) {
  console.error("Faltan variables administrativas locales. Consulta docs/acceso-institucional.md.");
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
try {
  if (command === "create") {
    const { error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    console.log("Cuenta creada en Auth. Asigna el acceso con el procedimiento SQL administrativo.");
  } else {
    let userId;
    for (let page = 1; ; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      userId = data.users.find((user) => user.email?.toLowerCase() === email)?.id;
      if (userId || data.users.length < 1000) break;
    }
    if (!userId) {
      console.error("La cuenta solicitada no existe en Auth.");
      process.exitCode = 1;
    } else {
      const { error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      console.log("Contraseña actualizada en Auth. Reactiva el acceso mediante el procedimiento SQL documentado.");
    }
  }
} catch (error) {
  console.error("Operación administrativa no realizada.", typeof error?.code === "string" ? `Código: ${error.code}` : "");
  process.exitCode = 1;
} finally {
  delete process.env.SUPABASE_NEW_PASSWORD;
}
