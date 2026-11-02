# QR Kód Generátor

Webová aplikace pro generování personalizovaných QR kódů. Postaveno na React, TypeScript, Vite a Tailwind CSS s designovým systémem Fluent 2.

## Funkce

- ✅ Generování QR kódů z textu/URL
- 🎨 Volitelná barva pozadí a popředí s kontrolou kontrastu (ISO/IEC 18004)
- 📐 Nastavitelné rozlišení (128–4096 px)
- 📄 Export do PNG (rastr) a SVG (vektor)
- 🔧 Volba úrovně korekce chyb (L, M, Q, H)
- 🖼️ Možnost vložit logo do středu QR kódu s automatickou validací velikosti

## Technologický stack

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS v4** (styling, Fluent 2 design)
- **qrcode** (generování QR kódů)

## Spuštění (vývoj)

```bash
npm install
npm run dev
```

## Docker nasazení

```bash
docker build -t qr-kod-generator .
docker run -p 8080:80 qr-kod-generator
```

Aplikace bude dostupná na `http://localhost:8080`.

## Licence

MIT
