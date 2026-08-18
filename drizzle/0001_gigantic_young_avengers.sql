CREATE TABLE `agent_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`findingId` int,
	`assetId` int,
	`payload` text NOT NULL,
	`previousHash` varchar(128) NOT NULL,
	`eventHash` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`decision` enum('approved','rejected') NOT NULL,
	`action` enum('redact','revoke_access') NOT NULL,
	`note` text,
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`source` enum('OneDrive','Slack','Outlook') NOT NULL,
	`content` text NOT NULL,
	`contentHash` varchar(128) NOT NULL,
	`status` enum('active','remediated') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `finding_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`policyId` int NOT NULL,
	`relevance` int NOT NULL DEFAULT 0,
	CONSTRAINT `finding_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`piiTypes` text NOT NULL,
	`evidence` text NOT NULL,
	`summary` text NOT NULL,
	`status` enum('open','approved','remediated') NOT NULL DEFAULT 'open',
	`recurrence` int NOT NULL DEFAULT 0,
	`priorFindingId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policy_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`framework` enum('ICRC','GDPR','Sphere Standards') NOT NULL,
	`title` varchar(255) NOT NULL,
	`citation` varchar(255) NOT NULL,
	`excerpt` text NOT NULL,
	`keywords` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policy_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `remediation_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingId` int NOT NULL,
	`action` enum('redact','revoke_access') NOT NULL,
	`beforeHash` varchar(128) NOT NULL,
	`afterHash` varchar(128) NOT NULL,
	`result` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `remediation_actions_id` PRIMARY KEY(`id`)
);
