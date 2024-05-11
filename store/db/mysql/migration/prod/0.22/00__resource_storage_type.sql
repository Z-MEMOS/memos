ALTER TABLE `resource` ADD COLUMN `storage_type` VARCHAR(256) NOT NULL DEFAULT '';
ALTER TABLE `resource` ADD COLUMN `reference` VARCHAR(256) NOT NULL DEFAULT '';
ALTER TABLE `resource` ADD COLUMN `payload` TEXT NOT NULL;

UPDATE `resource` SET `storage_type` = 'LOCAL', `reference` = `internal_path` WHERE `internal_path` IS NOT NULL AND `internal_path` != '';
UPDATE `resource` SET `storage_type` = 'EXTERNAL', `reference` = `external_link` WHERE `external_link` IS NOT NULL AND `external_link` != '';

ALTER TABLE `resource` DROP COLUMN `internal_path`;
ALTER TABLE `resource` DROP COLUMN `external_link`;
