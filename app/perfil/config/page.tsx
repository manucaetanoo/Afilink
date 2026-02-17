"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";


const uploadAvatarToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  // Podés usar un preset específico para avatars, o el mismo si te sirve
  formData.append("upload_preset", "products_preset");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dyxooovx5/image/upload",
    { method: "POST", body: formData }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Error subiendo imagen");
  }

  return data.secure_url as string;
};


type ProfileForm = {
  Nombre: string; // UI -> prisma: name
  Apellido: string; // UI -> prisma: lastName
  email: string; // readOnly
  username: string;
  timezone: string;
  avatarFile?: File | null; // si existe -> se sube a cloudinary
};

const TIMEZONES = [
  "America/Montevideo",
  "UTC",
  "Pacific Standard Time",
  "Eastern Standard Time",
  "Europe/Madrid",
  "Europe/London",
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ProfileSettingsWarmPage() {


  const router = useRouter();           // ✅ ADENTRO
  const { update: updateSession } = useSession();
  const [form, setForm] = useState<ProfileForm>({
    Nombre: "",
    Apellido: "",
    email: "",
    username: "",
    timezone: "America/Montevideo",
    avatarFile: null,
  });


 
  const [avatarPreview, setAvatarPreview] = useState<string>("/img/sin-foto.jpg");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const usernameDisplay = useMemo(() => form.username.trim(), [form.username]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }



  // Carga inicial desde la API
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/profile", { method: "GET" });
        const data = await res.json().catch(() => null);

        if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar el perfil");

        const u = data?.user;
        if (!u) throw new Error("Respuesta inválida");

        if (!alive) return;

        setForm((prev) => ({
          ...prev,
          Nombre: u.name ?? "",
          Apellido: u.lastName ?? "",
          email: u.email ?? "",
          username: u.username ?? "",
          timezone: u.timezone ?? "America/Montevideo",
        }));

        setAvatarPreview(u.image || "/img/sin-foto.jpg");
      } catch (err: any) {
        if (!alive) return;
        setMsg(err?.message ?? "Error cargando perfil");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    // opcional: validar tamaño (1MB)
    if (file.size > 1_000_000) {
      setMsg("La imagen debe pesar máximo 1MB");
      return;
    }

    update("avatarFile", file);

    // preview local
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setMsg(null);
  setSaving(true);

  try {
    let uploadedImageUrl: string | undefined;

    // 1) Subir avatar si hay archivo
    if (form.avatarFile) {
      uploadedImageUrl = await uploadAvatarToCloudinary(form.avatarFile);
      if (!uploadedImageUrl) throw new Error("Cloudinary no devolvió URL");
    }

    // 2) Guardar perfil (incluye image si se subió)
    const payload: Record<string, any> = {
      name: form.Nombre,
      lastName: form.Apellido,
      username: form.username,
      timezone: form.timezone,
      ...(uploadedImageUrl ? { image: uploadedImageUrl } : {}),
    };

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? "Error al guardar");

    // 3) Preview final
    if (uploadedImageUrl) {
      setAvatarPreview(uploadedImageUrl);
      update("avatarFile", null);
    }

    setMsg("Guardado ✅");
    await updateSession({
  user: {
    name: form.Nombre,
    email: form.email,               // opcional
    image: uploadedImageUrl ?? undefined,
    // role: ... (si lo querés)
  } as any,
});
router.push("/products");

  } catch (err: any) {
    setMsg(err?.message ?? "Error");
  } finally {
    setSaving(false);
  }
}

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-orange-200/70 blur-3xl" />
        <div className="absolute left-40 top-24 h-[420px] w-[420px] rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute -right-52 -bottom-52 h-[640px] w-[640px] rounded-full bg-orange-200/60 blur-3xl" />
        <div className="absolute right-32 bottom-24 h-[360px] w-[360px] rounded-full bg-amber-100/70 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.0)_0%,rgba(255,255,255,0.55)_45%,rgba(255,255,255,0.92)_75%,rgba(255,255,255,1)_100%)]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-[0_10px_30px_rgba(2,6,23,0.10)] backdrop-blur">
          <div className="grid gap-10 p-8 md:grid-cols-[320px_1fr] md:p-10">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Información personal
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Usá un email permanente donde recibas los mails.
              </p>

              {msg && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {msg}
                </div>
              )}
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  Cargando perfil...
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-5">
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200"
                    />

                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className={cn(buttonSoft, "cursor-pointer")}>
                          Cambiar foto
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/gif"
                            className="hidden"
                            onChange={onPickAvatar}
                          />
                        </label>

                        <span className="text-xs text-slate-500">
                          JPG, GIF o PNG. 1MB máx.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <Field label="Nombre">
                      <input
                        value={form.Nombre}
                        onChange={(e) => update("Nombre", e.target.value)}
                        className={inputClass}
                        autoComplete="given-name"
                      />
                    </Field>

                    <Field label="Apellido">
                      <input
                        value={form.Apellido}
                        onChange={(e) => update("Apellido", e.target.value)}
                        className={inputClass}
                        autoComplete="family-name"
                      />
                    </Field>

                    <Field label="Email" className="md:col-span-2">
                      <input
                        type="email"
                        value={form.email}
                        readOnly
                        className={cn(inputClass, "bg-slate-50 text-slate-600")}
                        autoComplete="email"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        El email no se cambia desde acá.
                      </p>
                    </Field>

                    <Field label="Username" className="md:col-span-2">
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                          example.com/
                        </span>
                        <input
                          value={usernameDisplay}
                          onChange={(e) => update("username", e.target.value)}
                          className={cn(inputClass, "pl-[112px]")}
                          placeholder="janesmith"
                          autoComplete="username"
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Solo letras/números y . _ - (3 a 30 caracteres)
                      </p>
                    </Field>

                    <Field label="Timezone" className="md:col-span-2">
                      <select
                        value={form.timezone}
                        onChange={(e) => update("timezone", e.target.value)}
                        className={selectClass}
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    
                    <button
                      type="submit"
                      className={cn(buttonPrimary, saving && "opacity-70 cursor-not-allowed")}
                      disabled={saving}
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                    

                    {msg && <span className="text-sm text-slate-700">{msg}</span>}
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 " +
  "ring-1 ring-slate-200 placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300/70";

const selectClass =
  "w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 " +
  "ring-1 ring-slate-200 " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300/70";

const buttonSoft =
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium " +
  "bg-slate-50 text-slate-900 ring-1 ring-slate-200 " +
  "hover:bg-slate-100 active:scale-[0.99]";

const buttonPrimary =
  "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white " +
  "bg-orange-500 hover:bg-orange-400 active:scale-[0.99] " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300/70";
