import { requireAdmin } from "@/lib/session";
import { getCompanySettings } from "@/lib/company-settings";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const settings = await getCompanySettings();
  const { error, saved } = await searchParams;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900">Company Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Used on the cover page, footer, and default validity of every exported proposal.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {saved && (
        <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Settings saved.
        </p>
      )}

      <form
        action="/api/admin/settings"
        method="POST"
        encType="multipart/form-data"
        className="mt-6 space-y-5"
      >
        <div className="flex items-center gap-4">
          {settings.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo is served from our own /uploads route, not next/image optimizable
            <img
              src={`/uploads/${settings.logoPath}`}
              alt="Current logo"
              className="h-16 w-16 rounded border border-neutral-200 object-contain bg-white"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-neutral-300 text-xs text-neutral-400">
              No logo
            </div>
          )}
          <div>
            <label htmlFor="logo" className="block text-sm font-medium text-neutral-700">
              Logo
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg"
              className="mt-1 text-sm"
            />
          </div>
        </div>

        <Field label="Company name" name="companyName" defaultValue={settings.companyName} />
        <Field label="Address" name="addressLine" defaultValue={settings.addressLine} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone" name="phone" defaultValue={settings.phone} />
          <Field label="Email" name="email" type="email" defaultValue={settings.email} />
        </div>
        <Field label="Website" name="website" defaultValue={settings.website} />
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Default validity (days)"
            name="defaultValidityDays"
            type="number"
            defaultValue={String(settings.defaultValidityDays)}
          />
        </div>
        <div>
          <label htmlFor="vatNoteText" className="block text-sm font-medium text-neutral-700">
            VAT note
          </label>
          <textarea
            id="vatNoteText"
            name="vatNoteText"
            defaultValue={settings.vatNoteText}
            rows={2}
            required
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
      />
    </div>
  );
}
