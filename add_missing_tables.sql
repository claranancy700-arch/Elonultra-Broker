-- Add Missing Tables to Elon-backend-db
-- Run this migration to enhance database functionality

-- 1. USER KYC/VERIFICATION TABLE
CREATE TABLE public.user_kyc (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL UNIQUE,
    verification_status character varying(50) DEFAULT 'pending',
    -- pending, verified, rejected, expired
    document_type character varying(50),
    document_number character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    date_of_birth date,
    nationality character varying(100),
    address character varying(500),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100),
    document_front_url character varying(500),
    document_back_url character varying(500),
    selfie_url character varying(500),
    submitted_at timestamp without time zone,
    verified_at timestamp without time zone,
    rejected_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT fk_user_kyc_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT kyc_status_check CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired'))
);

CREATE INDEX idx_user_kyc_status ON public.user_kyc(verification_status);
CREATE INDEX idx_user_kyc_user_id ON public.user_kyc(user_id);

-- 2. API KEYS TABLE
CREATE TABLE public.api_keys (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    key_hash character varying(255) NOT NULL UNIQUE,
    key_name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    last_used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone,
    CONSTRAINT fk_api_keys_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON public.api_keys(is_active);

-- 3. DEPOSIT ADDRESSES TABLE
CREATE TABLE public.deposit_addresses (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    crypto_type character varying(20) NOT NULL,
    address character varying(255) NOT NULL UNIQUE,
    label character varying(100),
    is_active boolean DEFAULT true,
    balance numeric(18,8) DEFAULT 0,
    total_received numeric(18,8) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    last_activity_at timestamp without time zone,
    CONSTRAINT fk_deposit_addresses_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT crypto_type_check CHECK (crypto_type IN ('BTC', 'ETH', 'USDT', 'USDC', 'XRP', 'ADA'))
);

CREATE INDEX idx_deposit_addresses_user_id ON public.deposit_addresses(user_id);
CREATE INDEX idx_deposit_addresses_crypto_type ON public.deposit_addresses(crypto_type);
CREATE INDEX idx_deposit_addresses_address ON public.deposit_addresses(address);
CREATE INDEX idx_deposit_addresses_active ON public.deposit_addresses(is_active);

-- 4. PRICE HISTORY TABLE
CREATE TABLE public.price_history (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    crypto_type character varying(20) NOT NULL,
    price_usd numeric(20,8) NOT NULL,
    market_cap numeric(30,2),
    volume_24h numeric(30,2),
    change_24h numeric(10,4),
    timestamp timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT price_check CHECK (price_usd > 0)
);

CREATE INDEX idx_price_history_crypto_type ON public.price_history(crypto_type);
CREATE INDEX idx_price_history_timestamp ON public.price_history(timestamp DESC);
CREATE INDEX idx_price_history_crypto_timestamp ON public.price_history(crypto_type, timestamp DESC);

-- 5. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    notification_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    data jsonb,
    action_url character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT notification_type_check CHECK (notification_type IN ('transaction', 'withdrawal', 'deposit', 'trade', 'alert', 'system', 'promotion'))
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read);

-- 6. SESSIONS TABLE
CREATE TABLE public.sessions (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL,
    session_token character varying(255) NOT NULL UNIQUE,
    ip_address character varying(45),
    user_agent text,
    device_type character varying(50),
    is_active boolean DEFAULT true,
    last_activity_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL,
    CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_token ON public.sessions(session_token);
CREATE INDEX idx_sessions_active ON public.sessions(is_active);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at);

-- 7. CRYPTO EXCHANGE RATES TABLE
CREATE TABLE public.exchange_rates (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    from_currency character varying(20) NOT NULL,
    to_currency character varying(20) NOT NULL,
    rate numeric(20,8) NOT NULL,
    source character varying(100),
    timestamp timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT exchange_rate_check CHECK (rate > 0)
);

CREATE INDEX idx_exchange_rates_pair ON public.exchange_rates(from_currency, to_currency);
CREATE INDEX idx_exchange_rates_timestamp ON public.exchange_rates(timestamp DESC);
CREATE UNIQUE INDEX idx_exchange_rates_latest ON public.exchange_rates(from_currency, to_currency, timestamp DESC);

-- 8. FEE CONFIGURATION TABLE
CREATE TABLE public.fee_config (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    fee_type character varying(50) NOT NULL UNIQUE,
    -- withdrawal, trading, deposit
    percentage_fee numeric(10,4) DEFAULT 0,
    flat_fee numeric(18,8) DEFAULT 0,
    minimum_amount numeric(18,8) DEFAULT 0,
    maximum_amount numeric(18,8),
    currency character varying(10) DEFAULT 'USD',
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT fee_type_check CHECK (fee_type IN ('withdrawal', 'trading', 'deposit')),
    CONSTRAINT fee_check CHECK ((percentage_fee >= 0) AND (flat_fee >= 0))
);

CREATE INDEX idx_fee_config_active ON public.fee_config(is_active);

-- 9. USER SETTINGS TABLE
CREATE TABLE public.user_settings (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id integer NOT NULL UNIQUE,
    theme character varying(50) DEFAULT 'dark',
    -- dark, light, auto
    language character varying(10) DEFAULT 'en',
    two_factor_enabled boolean DEFAULT false,
    two_factor_method character varying(50),
    -- email, sms, authenticator
    email_notifications boolean DEFAULT true,
    push_notifications boolean DEFAULT true,
    sms_notifications boolean DEFAULT false,
    withdrawal_notifications boolean DEFAULT true,
    trading_notifications boolean DEFAULT true,
    security_alerts boolean DEFAULT true,
    marketing_emails boolean DEFAULT false,
    timezone character varying(50) DEFAULT 'UTC',
    currency_display character varying(10) DEFAULT 'USD',
    show_portfolio_value boolean DEFAULT true,
    auto_logout_minutes integer DEFAULT 15,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT fk_user_settings_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT theme_check CHECK (theme IN ('dark', 'light', 'auto')),
    CONSTRAINT two_factor_method_check CHECK (two_factor_method IS NULL OR two_factor_method IN ('email', 'sms', 'authenticator'))
);

CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- 10. AUDIT LOG TABLE (Enhanced)
CREATE TABLE public.audit_logs (
    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id integer,
    admin_id integer,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    status character varying(50) DEFAULT 'success',
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_logs_admin_id FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Grant permissions if needed (uncomment for production)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
