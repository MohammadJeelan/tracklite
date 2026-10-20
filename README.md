# TrackLite

Client-side **multi-courier shipment tracking + delay explainer** for Indian e-commerce ops teams.

Built by **Mohammed Jeelan**. Runs entirely in the browser — no login, no backend, no paid APIs.

> Not affiliated with Shipsy, ClickPost, Delhivery, Blue Dart, Shiprocket, Ekart or XpressBees.

## Real use cases

- **D2C brand ops** — drop a morning Shiprocket / Delhivery / Blue Dart export, see which orders are late and why, export a CSV for the WhatsApp escalation group.
- **Aggregator handoff** — map columns once; TrackLite remembers the mapping for that header set.
- **Customer support** — copy a self-contained shareable tracking link (`#/s/...`). The customer does not need your CSV; the order is encoded in the URL hash.
- **Weekly standup** — print a late-orders report (browser print dialog) without leaving the page.

## Features

- **CSV upload with column mapping** — auto-detect plus manual remap. Synonyms cover field names verified in public docs:
  - Shiprocket API: `awb_code`, `courier_name`, `channel_order_id`, `current_status`, `shipment_status`, `etd`, `pickup_date`, `delivered_date`, `origin`, `destination`
  - Delhivery tracking API: `AWB`, `ReferenceNo`, `Status`, `StatusDateTime`, `StatusLocation`, `Instructions`, `PickUpDate`, `Origin`, `Destination`, `PinCode`
  - Blue Dart tracking: `WaybillNo`, `RefNo`, `Status`, `PickUpDate`, `Origin`, `Destination`, `ExpectedDeliveryDate`, `Instructions`
  - Ekart: no public export column list found, so nothing Ekart-specific is claimed
- **Saved datasets** in `localStorage` (up to 8)
- **Status normalizer** — courier codes + free-text heuristics → one model
- **Ops dashboard** — on-time %, delayed, in transit, RTO; charts; late table with filters
- **Shareable tracking links** — `#/s/<payload>` encodes the order; `#/track/:id` works against the loaded dataset
- **Late-orders report** — CSV download + printable HTML view
- Sample of ~200 fake Indian shipments for demos

## Tech

Vite + React 19 + TypeScript · Papa Parse · Recharts · hash router

## Run

```bash
npm install
npm run dev
```

Click **Load sample data**, or drop your own CSV and confirm the column map.

```bash
npm run build && npm run preview
```

## Sample CSV columns (bundled)

`order_id, courier, origin_city, destination_city, pincode, created_at, promised_date, delivered_at, status_events`

`status_events` is `;`-separated `timestamp|rawCode|location|remark`.

## Privacy

Shipments and saved datasets never leave the browser. Share links put the chosen order into the URL hash — treat them like any tracking URL you would send a customer.

## License

MIT
