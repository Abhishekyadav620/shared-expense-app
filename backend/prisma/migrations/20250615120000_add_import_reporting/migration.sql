-- CreateTable
CREATE TABLE `ImportReport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `totalRows` INTEGER NOT NULL,
    `successfulImports` INTEGER NOT NULL,
    `skippedRows` INTEGER NOT NULL,
    `anomalyCount` INTEGER NOT NULL,
    `usdToInrRate` DECIMAL(10, 4) NULL,
    `reportJson` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportAnomaly` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `importReportId` INTEGER NOT NULL,
    `rowNumber` INTEGER NOT NULL,
    `issueType` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `suggestedAction` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `importReportId` INTEGER NOT NULL,
    `rowNumber` INTEGER NOT NULL,
    `issueType` VARCHAR(191) NOT NULL,
    `actionTaken` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ImportReport` ADD CONSTRAINT `ImportReport_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `Group`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportReport` ADD CONSTRAINT `ImportReport_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportAnomaly` ADD CONSTRAINT `ImportAnomaly_importReportId_fkey` FOREIGN KEY (`importReportId`) REFERENCES `ImportReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportReview` ADD CONSTRAINT `ImportReview_importReportId_fkey` FOREIGN KEY (`importReportId`) REFERENCES `ImportReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
