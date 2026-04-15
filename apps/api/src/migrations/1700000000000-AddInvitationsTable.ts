import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddInvitationsTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'invitations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'guide_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'invited_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'inviter_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'accepted', 'declined'],
            default: "'pending'",
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'username',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'accepted_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'declined_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'invitations',
      new TableForeignKey({
        columnNames: ['guide_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'guides',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'invitations',
      new TableForeignKey({
        columnNames: ['invited_user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'invitations',
      new TableForeignKey({
        columnNames: ['inviter_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('invitations');
  }
}