# Supabase scheme catalog import

This folder contains the first data import for the SW-01 scheme finder:

1. Run `schema.sql` in the Supabase SQL Editor.
2. Run `seed.sql` after it succeeds.

The schema migration and seed have been applied to the connected Supabase project. The `public.schemes` table is enabled for public read access under row-level security, and it currently contains seven seeded records. The seed uses upsert, so rerunning it updates those seven rows by slug.

The catalog supports three scope tabs: **All**, **Manipur**, and **Other schemes**. Use `scope = 'manipur_state'` for Manipur state schemes and `scope = 'central_in_manipur'` for national schemes available through Manipur. Use `department` as the department filter. The `other` value is reserved for records outside those groups.

This initial seed contains seven Manipur Social Welfare records with official source links. Several source documents establish criteria for their own reporting period but do not establish that applications are open today. Those records therefore use `application_status = 'check_with_department'` and `data_status = 'needs_confirmation'`. `last_verified_at` records when the official sources were checked; it does not imply that the scheme office confirmed current availability.

The existing app also has a broader 14-scheme sample in `server/demoData.js`. Those rows are not copied into this verified seed: several have old or incomplete details. Review and source each before importing them as live catalog data. Keep any retained sample rows marked `legacy_demo` until reviewed.

Sources:

- [Manipur Social Welfare Department](https://www.socialwelfare.mn.gov.in/en/)
- [Manipur Social Welfare Administrative Report 2025–26](https://assembly.mn.gov.in/user/pages/files/administrative-reports/AA%20Report%20Social%20Welfare%202025-26.pdf)
- [Manipur Economic Survey 2024–25](https://assembly.mn.gov.in/user/pages/files/business/papers-laid/Economic%20Survey%20Manipur%2C%202024-25%20Directorate%20of%20Economics%20%26%20Statistics.pdf)
- [Manipur Old Age Pension Rules](https://www.socialwelfare.mn.gov.in/en/rules-regulations/manipur-old-age-pension/)
