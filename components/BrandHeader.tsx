import Image from "next/image";

export function BrandHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/LOGO-PRODUTECNICA-COR-HORIZONTAL.png"
        alt="Produtécnica Agro"
        width={220}
        height={86}
        priority
        className="h-auto w-[220px]"
      />
      <h1
        className="mt-4 text-2xl font-semibold"
        style={{ color: "#084897" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      )}
    </div>
  );
}
