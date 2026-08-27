CREATE TABLE `patient_login_challenges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `patient_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `patient_sessions_token_hash_unique` ON `patient_sessions` (`token_hash`);--> statement-breakpoint
DROP INDEX `appointments_availability_unique`;--> statement-breakpoint
ALTER TABLE `appointments` ADD `cancelled_at` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `reschedule_requested_at` text;--> statement-breakpoint
ALTER TABLE `appointments` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `appointments_active_availability_unique` ON `appointments` (`availability_id`) WHERE "appointments"."status" IN ('pending', 'confirmed', 'reschedule_requested');--> statement-breakpoint
ALTER TABLE `patients` ADD `whatsapp_normalized` text;--> statement-breakpoint
ALTER TABLE `patients` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `patients` ADD `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `patients_whatsapp_normalized_unique` ON `patients` (`whatsapp_normalized`);