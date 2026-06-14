-- Add groupId to Settlement for group-scoped payment records
ALTER TABLE `Settlement` ADD COLUMN `groupId` INTEGER NOT NULL;

ALTER TABLE `Settlement` ADD CONSTRAINT `Settlement_groupId_fkey`
  FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
