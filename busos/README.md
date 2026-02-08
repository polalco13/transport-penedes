# Busos Penedès

App web de consulta d'horaris de bus (Penedès) amb dades locals JSON i sense backend.

## Scripts

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## Funcionalitats

- Cerca de propers busos per origen/destinació.
- Horari complet de la ruta seleccionada.
- Càlcul de compte enrere només quan la consulta és per avui.
- Detecció d'origen per geolocalització.
- Persistència de preferències (tema, festiu BCN, últim trajecte) via `localStorage`.
- URL compartible amb estat (`o`, `d`, `day`, `festiu`).

## Arquitectura

- UI principal: `/Users/polalcoverro/Documents/transport-penedes/busos/src/app/page.tsx`
- Domini/horaris: `/Users/polalcoverro/Documents/transport-penedes/busos/src/lib/schedule/scheduleService.ts`
- Tests de domini: `/Users/polalcoverro/Documents/transport-penedes/busos/src/lib/schedule/scheduleService.test.ts`
- Component compte enrere: `/Users/polalcoverro/Documents/transport-penedes/busos/src/components/Countdown.tsx`

## Notes

- Les dades provenen de fitxers JSON locals a `src/app/data/`.
- `scheduleService` valida el format de `horaris.json` a runtime (`parseHorarisData`).
- Els tests actuals cobreixen la lògica de calendari, cerca i validació de dades.
