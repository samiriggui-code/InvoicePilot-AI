-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TwoFactorChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "OrganizationSize" AS ENUM ('MICRO', 'PME', 'ETI', 'GE');

-- CreateEnum
CREATE TYPE "VatRegime" AS ENUM ('STANDARD', 'FRANCHISE_BASE', 'EXEMPT');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateEnum
CREATE TYPE "DiagnosticItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CounterpartyType" AS ENUM ('CLIENT', 'SUPPLIER', 'BOTH');

-- CreateEnum
CREATE TYPE "InvoiceDirection" AS ENUM ('SALE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('QUOTE', 'INVOICE', 'CREDIT_NOTE', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'VALIDATING', 'BLOCKED', 'VALIDATED', 'TRANSMITTING', 'TRANSMITTED', 'RECEIVED', 'REJECTED', 'REFUSED', 'APPROVED', 'PAID', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InvoiceFormat" AS ENUM ('FACTUR_X', 'UBL', 'CII');

-- CreateEnum
CREATE TYPE "OperationCategory" AS ENUM ('GOODS', 'SERVICES', 'MIXED');

-- CreateEnum
CREATE TYPE "ValidationSeverity" AS ENUM ('ERROR', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "PlatformConnectionPurpose" AS ENUM ('EMISSION', 'RECEPTION', 'BOTH');

-- CreateEnum
CREATE TYPE "LifecycleScope" AS ENUM ('EMISSION', 'RECEPTION');

-- CreateEnum
CREATE TYPE "ComplianceVolut" AS ENUM ('E_INVOICING', 'E_REPORTING_TRANSACTION', 'E_REPORTING_PAYMENT');

-- CreateEnum
CREATE TYPE "AiRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT,
    "email_verified" TIMESTAMP(3),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "channel" "TwoFactorChannel" NOT NULL DEFAULT 'EMAIL',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "siren" VARCHAR(9) NOT NULL,
    "siret" VARCHAR(14),
    "vat_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "postal_code" TEXT,
    "city" TEXT,
    "country_code" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "size" "OrganizationSize" NOT NULL DEFAULT 'PME',
    "vat_regime" "VatRegime" NOT NULL DEFAULT 'STANDARD',
    "compliance_score" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'COLLABORATOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_diagnostics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "company_size" "OrganizationSize",
    "vat_regime" "VatRegime",
    "has_b2b_clients" BOOLEAN NOT NULL DEFAULT true,
    "has_b2c_clients" BOOLEAN NOT NULL DEFAULT false,
    "has_foreign_clients" BOOLEAN NOT NULL DEFAULT false,
    "has_public_sector" BOOLEAN NOT NULL DEFAULT false,
    "current_tooling" TEXT,
    "must_receive_by" TIMESTAMP(3),
    "must_emit_by" TIMESTAMP(3),
    "needs_e_invoicing" BOOLEAN NOT NULL DEFAULT true,
    "needs_e_reporting_tx" BOOLEAN NOT NULL DEFAULT false,
    "needs_e_reporting_pay" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_diagnostics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_checklist_items" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "status" "DiagnosticItemStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparties" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "CounterpartyType" NOT NULL DEFAULT 'CLIENT',
    "legal_name" TEXT NOT NULL,
    "siren" VARCHAR(9),
    "siret" VARCHAR(14),
    "vat_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "billing_line1" TEXT,
    "billing_line2" TEXT,
    "billing_postal" TEXT,
    "billing_city" TEXT,
    "billing_country" VARCHAR(2) NOT NULL DEFAULT 'FR',
    "delivery_line1" TEXT,
    "delivery_line2" TEXT,
    "delivery_postal" TEXT,
    "delivery_city" TEXT,
    "delivery_country" VARCHAR(2),
    "directory_pa_name" TEXT,
    "directory_routing_addr" TEXT,
    "directory_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'FAC',
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "padding" INTEGER NOT NULL DEFAULT 4,
    "fiscal_year" INTEGER,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "counterparty_id" TEXT,
    "direction" "InvoiceDirection" NOT NULL DEFAULT 'SALE',
    "type" "InvoiceType" NOT NULL DEFAULT 'INVOICE',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "format" "InvoiceFormat",
    "number" TEXT,
    "issue_date" DATE,
    "service_date" DATE,
    "due_date" DATE,
    "purchase_order_ref" TEXT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "buyer_siren" VARCHAR(9),
    "operation_category" "OperationCategory",
    "vat_on_debits_option" BOOLEAN NOT NULL DEFAULT false,
    "delivery_differs" BOOLEAN NOT NULL DEFAULT false,
    "payment_terms_days" INTEGER,
    "early_payment_discount" DECIMAL(5,2),
    "late_penalty_rate" DECIMAL(5,2),
    "recovery_fee_amount" DECIMAL(10,2) NOT NULL DEFAULT 40,
    "franchise_vat_mention" BOOLEAN NOT NULL DEFAULT false,
    "reverse_charge" BOOLEAN NOT NULL DEFAULT false,
    "subtotal_ht" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_vat" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_ttc" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "compliance_score" DECIMAL(5,2),
    "source_quote_id" TEXT,
    "corrected_invoice_id" TEXT,
    "credit_note_for_id" TEXT,
    "facturx_storage_key" TEXT,
    "ubl_storage_key" TEXT,
    "pdf_storage_key" TEXT,
    "platform_connection_id" TEXT,
    "pa_reference" TEXT,
    "transmitted_at" TIMESTAMP(3),
    "issued_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit_price_ht" DECIMAL(14,4) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL,
    "line_total_ht" DECIMAL(14,2) NOT NULL,
    "line_vat" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_validations" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "ValidationSeverity" NOT NULL,
    "field" TEXT,
    "blocking" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approved_platforms" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dgfip_reference" TEXT,
    "website_url" TEXT,
    "api_docs_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approved_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_platform_connections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "platform_id" TEXT NOT NULL,
    "purpose" "PlatformConnectionPurpose" NOT NULL DEFAULT 'BOTH',
    "label" TEXT,
    "credentials_ref" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_platform_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lifecycle_events" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "scope" "LifecycleScope" NOT NULL DEFAULT 'EMISSION',
    "source" TEXT NOT NULL DEFAULT 'system',
    "message" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "e_reporting_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "volut" "ComplianceVolut" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "transmitted_at" TIMESTAMP(3),
    "pa_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "e_reporting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reporting_entries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "amount_received" DECIMAL(14,2) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "vat_amount" DECIMAL(14,2),
    "transmitted_at" TIMESTAMP(3),
    "pa_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reporting_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT NOT NULL,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" "AiRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "events" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "two_factor_codes_user_id_expires_at_idx" ON "two_factor_codes"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_siret_key" ON "organizations"("siret");

-- CreateIndex
CREATE INDEX "organizations_siren_idx" ON "organizations"("siren");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "compliance_diagnostics_organization_id_idx" ON "compliance_diagnostics"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_checklist_items_organization_id_code_key" ON "compliance_checklist_items"("organization_id", "code");

-- CreateIndex
CREATE INDEX "counterparties_organization_id_siren_idx" ON "counterparties"("organization_id", "siren");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_sequences_organization_id_prefix_fiscal_year_key" ON "invoice_sequences"("organization_id", "prefix", "fiscal_year");

-- CreateIndex
CREATE INDEX "invoices_organization_id_status_idx" ON "invoices"("organization_id", "status");

-- CreateIndex
CREATE INDEX "invoices_organization_id_issue_date_idx" ON "invoices"("organization_id", "issue_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organization_id_number_key" ON "invoices"("organization_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_lines_invoice_id_line_number_key" ON "invoice_lines"("invoice_id", "line_number");

-- CreateIndex
CREATE INDEX "invoice_validations_invoice_id_idx" ON "invoice_validations"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "approved_platforms_slug_key" ON "approved_platforms"("slug");

-- CreateIndex
CREATE INDEX "organization_platform_connections_organization_id_idx" ON "organization_platform_connections"("organization_id");

-- CreateIndex
CREATE INDEX "invoice_lifecycle_events_invoice_id_occurred_at_idx" ON "invoice_lifecycle_events"("invoice_id", "occurred_at");

-- CreateIndex
CREATE INDEX "e_reporting_entries_organization_id_period_start_idx" ON "e_reporting_entries"("organization_id", "period_start");

-- CreateIndex
CREATE INDEX "payment_reporting_entries_organization_id_received_at_idx" ON "payment_reporting_entries"("organization_id", "received_at");

-- CreateIndex
CREATE INDEX "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_organization_id_idx" ON "api_keys"("organization_id");

-- CreateIndex
CREATE INDEX "webhook_endpoints_organization_id_idx" ON "webhook_endpoints"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_codes" ADD CONSTRAINT "two_factor_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_diagnostics" ADD CONSTRAINT "compliance_diagnostics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_checklist_items" ADD CONSTRAINT "compliance_checklist_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparties" ADD CONSTRAINT "counterparties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_sequences" ADD CONSTRAINT "invoice_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_platform_connection_id_fkey" FOREIGN KEY ("platform_connection_id") REFERENCES "organization_platform_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_validations" ADD CONSTRAINT "invoice_validations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_platform_connections" ADD CONSTRAINT "organization_platform_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_platform_connections" ADD CONSTRAINT "organization_platform_connections_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "approved_platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lifecycle_events" ADD CONSTRAINT "invoice_lifecycle_events_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_reporting_entries" ADD CONSTRAINT "e_reporting_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "e_reporting_entries" ADD CONSTRAINT "e_reporting_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reporting_entries" ADD CONSTRAINT "payment_reporting_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
