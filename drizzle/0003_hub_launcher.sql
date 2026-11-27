ALTER TABLE `hub_settings` ADD `launcherSeeded` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shortcuts` ADD `kind` enum('ai','app','site','social','tool') DEFAULT 'tool' NOT NULL;--> statement-breakpoint
ALTER TABLE `shortcuts` ADD `description` varchar(200);--> statement-breakpoint
ALTER TABLE `shortcuts` ADD `emoji` varchar(8);--> statement-breakpoint
ALTER TABLE `shortcuts` ADD `pinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shortcuts` ADD `openCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `shortcuts` ADD `lastOpenedAt` timestamp;