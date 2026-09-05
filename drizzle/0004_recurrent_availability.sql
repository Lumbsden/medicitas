CREATE TABLE `availability_series` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `clinic_id` integer NOT NULL,
  `doctor_id` integer NOT NULL,
  `first_starts_at` text NOT NULL,
  `weeks` integer NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`clinic_id`) REFERENCES `clinics`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`doctor_id`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE no action
);
