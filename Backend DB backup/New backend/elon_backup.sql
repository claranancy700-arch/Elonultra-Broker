--
-- PostgreSQL database dump
--

\restrict AECqe8SoWNyj0GYSy2Zj6xRXa9TTwuIrhjRWGBm7H23OcKKxomzTpU8ZVjXz852

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2026-03-23 07:32:30

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 24577)
-- Name: admin_audit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_audit (
    id integer NOT NULL,
    admin_key text,
    action text,
    details jsonb,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.admin_audit OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 24584)
-- Name: admin_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_audit_id_seq OWNER TO postgres;

--
-- TOC entry 5325 (class 0 OID 0)
-- Dependencies: 220
-- Name: admin_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_audit_id_seq OWNED BY public.admin_audit.id;


--
-- TOC entry 238 (class 1259 OID 24765)
-- Name: api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    user_id integer NOT NULL,
    key_hash character varying(255) NOT NULL,
    key_name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    last_used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone
);


ALTER TABLE public.api_keys OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 24764)
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.api_keys ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.api_keys_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 254 (class 1259 OID 24952)
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    admin_id integer,
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    status character varying(50) DEFAULT 'success'::character varying,
    error_message text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 24951)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 221 (class 1259 OID 24585)
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    name character varying(255),
    email character varying(255) NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 24594)
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO postgres;

--
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 222
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- TOC entry 240 (class 1259 OID 24789)
-- Name: deposit_addresses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deposit_addresses (
    id integer NOT NULL,
    user_id integer NOT NULL,
    crypto_type character varying(20) NOT NULL,
    address character varying(255) NOT NULL,
    label character varying(100),
    is_active boolean DEFAULT true,
    balance numeric(18,8) DEFAULT 0,
    total_received numeric(18,8) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    last_activity_at timestamp without time zone,
    CONSTRAINT crypto_type_check CHECK (((crypto_type)::text = ANY ((ARRAY['BTC'::character varying, 'ETH'::character varying, 'USDT'::character varying, 'USDC'::character varying, 'XRP'::character varying, 'ADA'::character varying])::text[])))
);


ALTER TABLE public.deposit_addresses OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 24788)
-- Name: deposit_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.deposit_addresses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.deposit_addresses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 248 (class 1259 OID 24880)
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exchange_rates (
    id integer NOT NULL,
    from_currency character varying(20) NOT NULL,
    to_currency character varying(20) NOT NULL,
    rate numeric(20,8) NOT NULL,
    source character varying(100),
    "timestamp" timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT exchange_rate_check CHECK ((rate > (0)::numeric))
);


ALTER TABLE public.exchange_rates OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 24879)
-- Name: exchange_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.exchange_rates ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.exchange_rates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 250 (class 1259 OID 24896)
-- Name: fee_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fee_config (
    id integer NOT NULL,
    fee_type character varying(50) NOT NULL,
    percentage_fee numeric(10,4) DEFAULT 0,
    flat_fee numeric(18,8) DEFAULT 0,
    minimum_amount numeric(18,8) DEFAULT 0,
    maximum_amount numeric(18,8),
    currency character varying(10) DEFAULT 'USD'::character varying,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT fee_check CHECK (((percentage_fee >= (0)::numeric) AND (flat_fee >= (0)::numeric))),
    CONSTRAINT fee_type_check CHECK (((fee_type)::text = ANY ((ARRAY['withdrawal'::character varying, 'trading'::character varying, 'deposit'::character varying])::text[])))
);


ALTER TABLE public.fee_config OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 24895)
-- Name: fee_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.fee_config ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.fee_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 244 (class 1259 OID 24830)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp without time zone,
    data jsonb,
    action_url character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT notification_type_check CHECK (((notification_type)::text = ANY ((ARRAY['transaction'::character varying, 'withdrawal'::character varying, 'deposit'::character varying, 'trade'::character varying, 'alert'::character varying, 'system'::character varying, 'promotion'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 24829)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 223 (class 1259 OID 24595)
-- Name: portfolio; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portfolio (
    id integer NOT NULL,
    user_id integer NOT NULL,
    btc_balance numeric(18,8) DEFAULT 0,
    eth_balance numeric(18,8) DEFAULT 0,
    usdt_balance numeric(18,8) DEFAULT 0,
    usdc_balance numeric(18,8) DEFAULT 0,
    xrp_balance numeric(18,8) DEFAULT 0,
    ada_balance numeric(18,8) DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now(),
    usd_value numeric(20,8) DEFAULT 0
);


ALTER TABLE public.portfolio OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 24608)
-- Name: portfolio_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.portfolio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.portfolio_id_seq OWNER TO postgres;

--
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 224
-- Name: portfolio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.portfolio_id_seq OWNED BY public.portfolio.id;


--
-- TOC entry 242 (class 1259 OID 24815)
-- Name: price_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_history (
    id integer NOT NULL,
    crypto_type character varying(20) NOT NULL,
    price_usd numeric(20,8) NOT NULL,
    market_cap numeric(30,2),
    volume_24h numeric(30,2),
    change_24h numeric(10,4),
    "timestamp" timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT price_check CHECK ((price_usd > (0)::numeric))
);


ALTER TABLE public.price_history OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 24814)
-- Name: price_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.price_history ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.price_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 246 (class 1259 OID 24855)
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    session_token character varying(255) NOT NULL,
    ip_address character varying(45),
    user_agent text,
    device_type character varying(50),
    is_active boolean DEFAULT true,
    last_activity_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 24854)
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.sessions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 225 (class 1259 OID 24609)
-- Name: testimonies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.testimonies (
    id integer NOT NULL,
    client_name character varying(255) NOT NULL,
    client_image character varying(500),
    title character varying(255),
    rating integer,
    content text NOT NULL,
    is_featured boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT testimonies_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.testimonies OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 24621)
-- Name: testimonies_id_seq1; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.testimonies_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.testimonies_id_seq1 OWNER TO postgres;

--
-- TOC entry 5328 (class 0 OID 0)
-- Dependencies: 226
-- Name: testimonies_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.testimonies_id_seq1 OWNED BY public.testimonies.id;


--
-- TOC entry 227 (class 1259 OID 24622)
-- Name: trades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trades (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    asset character varying(20) NOT NULL,
    amount numeric(18,8) NOT NULL,
    price numeric(18,8) NOT NULL,
    total numeric(18,8) NOT NULL,
    balance_before numeric(18,8) NOT NULL,
    balance_after numeric(18,8) NOT NULL,
    status character varying(50) DEFAULT 'completed'::character varying,
    is_simulated boolean DEFAULT false,
    generated_at timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT positive_amount CHECK ((amount > (0)::numeric)),
    CONSTRAINT positive_price CHECK ((price > (0)::numeric))
);


ALTER TABLE public.trades OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 24640)
-- Name: trades_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trades_id_seq OWNER TO postgres;

--
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 228
-- Name: trades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trades_id_seq OWNED BY public.trades.id;


--
-- TOC entry 229 (class 1259 OID 24641)
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    user_id integer,
    type character varying(50) NOT NULL,
    amount numeric(20,8) NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying,
    status character varying(50) DEFAULT 'completed'::character varying,
    reference character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT transactions_type_check CHECK (((type)::text = ANY (ARRAY[('deposit'::character varying)::text, ('withdrawal'::character varying)::text, ('buy'::character varying)::text, ('sell'::character varying)::text, ('adjustment'::character varying)::text, ('credit'::character varying)::text, ('trade'::character varying)::text])))
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 24652)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- TOC entry 5330 (class 0 OID 0)
-- Dependencies: 230
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- TOC entry 236 (class 1259 OID 24742)
-- Name: user_kyc; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_kyc (
    id integer NOT NULL,
    user_id integer NOT NULL,
    verification_status character varying(50) DEFAULT 'pending'::character varying,
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
    CONSTRAINT kyc_status_check CHECK (((verification_status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.user_kyc OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 24741)
-- Name: user_kyc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.user_kyc ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_kyc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 252 (class 1259 OID 24918)
-- Name: user_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    theme character varying(50) DEFAULT 'dark'::character varying,
    language character varying(10) DEFAULT 'en'::character varying,
    two_factor_enabled boolean DEFAULT false,
    two_factor_method character varying(50),
    email_notifications boolean DEFAULT true,
    push_notifications boolean DEFAULT true,
    sms_notifications boolean DEFAULT false,
    withdrawal_notifications boolean DEFAULT true,
    trading_notifications boolean DEFAULT true,
    security_alerts boolean DEFAULT true,
    marketing_emails boolean DEFAULT false,
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    currency_display character varying(10) DEFAULT 'USD'::character varying,
    show_portfolio_value boolean DEFAULT true,
    auto_logout_minutes integer DEFAULT 15,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT theme_check CHECK (((theme)::text = ANY ((ARRAY['dark'::character varying, 'light'::character varying, 'auto'::character varying])::text[]))),
    CONSTRAINT two_factor_method_check CHECK (((two_factor_method IS NULL) OR ((two_factor_method)::text = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'authenticator'::character varying])::text[]))))
);


ALTER TABLE public.user_settings OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 24917)
-- Name: user_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.user_settings ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 231 (class 1259 OID 24653)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255),
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    balance numeric(18,8) DEFAULT 0,
    portfolio_value numeric(20,8) DEFAULT 0,
    phone character varying(20),
    sim_enabled boolean DEFAULT false,
    sim_paused boolean DEFAULT false,
    sim_next_run_at timestamp without time zone,
    sim_last_run_at timestamp without time zone,
    sim_started_at timestamp without time zone,
    tax_id character varying(255),
    is_active boolean DEFAULT true,
    deleted_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 24668)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 232
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 233 (class 1259 OID 24669)
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.withdrawals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount numeric(18,8) NOT NULL,
    crypto_type character varying(20) NOT NULL,
    crypto_address character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    txn_hash character varying(255),
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    processed_at timestamp without time zone,
    CONSTRAINT withdrawals_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('processing'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text])))
);


ALTER TABLE public.withdrawals OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 24682)
-- Name: withdrawals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.withdrawals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.withdrawals_id_seq OWNER TO postgres;

--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 234
-- Name: withdrawals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.withdrawals_id_seq OWNED BY public.withdrawals.id;


--
-- TOC entry 4941 (class 2604 OID 24683)
-- Name: admin_audit id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_audit ALTER COLUMN id SET DEFAULT nextval('public.admin_audit_id_seq'::regclass);


--
-- TOC entry 4943 (class 2604 OID 24684)
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- TOC entry 4945 (class 2604 OID 24685)
-- Name: portfolio id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio ALTER COLUMN id SET DEFAULT nextval('public.portfolio_id_seq'::regclass);


--
-- TOC entry 4954 (class 2604 OID 24686)
-- Name: testimonies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testimonies ALTER COLUMN id SET DEFAULT nextval('public.testimonies_id_seq1'::regclass);


--
-- TOC entry 4958 (class 2604 OID 24687)
-- Name: trades id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trades ALTER COLUMN id SET DEFAULT nextval('public.trades_id_seq'::regclass);


--
-- TOC entry 4963 (class 2604 OID 24688)
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- TOC entry 4968 (class 2604 OID 24689)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4976 (class 2604 OID 24690)
-- Name: withdrawals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals ALTER COLUMN id SET DEFAULT nextval('public.withdrawals_id_seq'::regclass);


--
-- TOC entry 5284 (class 0 OID 24577)
-- Dependencies: 219
-- Data for Name: admin_audit; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_audit (id, admin_key, action, details, created_at) FROM stdin;
1	dev_admin_api_key_251104	set-balance	{"amount": 3762, "userId": 3}	2026-01-04 02:52:40.790644
2	dev_admin_api_key_251104	set-balance	{"amount": 3762, "userId": 2}	2026-01-04 02:54:37.820446
3	dev_admin_api_key_251104	set-portfolio	{"assets": {"BTC": 0.00673, "ETH": 0.378, "USDC": 355, "USDT": 112}, "userId": 2}	2026-01-04 02:57:31.923044
4	dev_admin_api_key_251104	set-balance	{"amount": 2777, "userId": 3}	2026-01-04 03:44:34.973864
5	dev_admin_api_key_251104	set-balance	{"amount": 34425, "userId": 3}	2026-01-04 03:55:19.014272
6	dev_admin_api_key_251104	set-portfolio	{"assets": {"BTC": 0.00673, "ETH": 0.378, "USDC": 355, "USDT": 112}, "userId": 2}	2026-01-04 04:17:04.65738
7	dev_admin_api_key_251104	set-balance	{"amount": 4525, "userId": 3}	2026-01-04 04:17:41.738413
8	dev_admin_api_key_251104	set-balance	{"amount": 386, "userId": 3}	2026-01-04 04:59:56.050251
9	dev_admin_api_key_251104	set-balance	{"amount": 34452, "userId": 3}	2026-01-04 05:00:33.849711
10	dev_admin_api_key_251104	set-balance	{"amount": 5436, "userId": 3}	2026-01-04 05:38:13.036718
11	dev_admin_api_key_251104	credit	{"amount": 4552, "userId": 3, "currency": "USD", "reference": "admin-adjust-portfolio"}	2026-01-04 05:38:33.672427
12	dev_admin_api_key_251104	set-portfolio	{"assets": {"BTC": 0.45, "ETH": 0.998, "USDC": 455, "USDT": 142}, "userId": 3}	2026-01-04 05:39:05.114379
13	dev_admin_api_key_251104	credit	{"amount": 9988, "userId": 3, "currency": "USD", "reference": "admin-adjust-portfolio"}	2026-01-04 05:39:55.398456
14	dev_admin_api_key_251104	set-balance	{"amount": 4566, "userId": 3}	2026-01-04 05:41:17.417854
15	dev_admin_api_key_251104	set-balance	{"amount": 5662, "userId": 3}	2026-01-05 11:39:34.726343
16	dev_admin_api_key_251104	set-balance	{"amount": 6324, "userId": 3}	2026-01-05 11:44:05.869433
17	dev_admin_api_key_251104	set-balance	{"amount": 5566, "userId": 3}	2026-01-05 11:44:22.226463
18	dev_admin_api_key_251104	set-balance	{"amount": 54343, "userId": 3}	2026-01-05 11:44:53.688786
19	dev_admin_api_key_251104	set-balance	{"amount": 3432, "userId": 3}	2026-01-05 11:45:08.454686
20	dev_admin_api_key_251104	set-balance	{"amount": 4433, "userId": 3}	2026-01-05 11:45:25.855739
21	dev_admin_api_key_251104	set-balance	{"amount": 5456, "userId": 3}	2026-01-05 11:47:12.220575
22	dev_admin_api_key_251104	set-balance	{"amount": 45534, "userId": 3}	2026-01-05 11:47:26.690735
23	dev_admin_api_key_251104	set-balance	{"amount": 3412, "userId": 3}	2026-01-05 11:50:36.546844
24	dev_admin_api_key_251104	set-balance	{"amount": 4545, "userId": 3}	2026-01-05 11:55:18.429537
25	dev_admin_api_key_251104	set-balance	{"amount": 65445, "userId": 3}	2026-01-05 11:58:58.784182
26	dev_admin_api_key_251104	set-balance	{"amount": 5645, "userId": 3}	2026-01-05 12:07:41.334512
27	dev_admin_api_key_251104	set-balance	{"amount": 5656, "userId": 2}	2026-01-06 05:57:15.843441
28	dev_admin_api_key_251104	set-portfolio	{"assets": {"BTC": 0.003443, "ETH": 0.12, "USDC": 87, "USDT": 212}, "userId": 2}	2026-01-06 05:58:06.876851
29	dev_admin_api_key_251104	set-balance	{"amount": 1332, "userId": 3}	2026-01-06 06:09:15.453945
30	dev_admin_api_key_251104	set-portfolio	{"assets": {"BTC": 0.45, "ETH": 0.998, "USDC": 455, "USDT": 142}, "userId": 3}	2026-01-06 06:09:41.569368
31	dev_admin_api_key_251104	set-balance	{"amount": 4322, "userId": 3}	2026-01-06 06:10:50.34032
32	dev_admin_api_key_251104	set-portfolio	{"assets": {"BTC": 0.45, "ETH": 0.998, "USDC": 455, "USDT": 142}, "userId": 3}	2026-01-06 06:14:32.361843
33	dev_admin_api_key_251104	set-portfolio	{"assets": {"BTC": 0.00443, "ETH": 0.32, "USDC": 27, "USDT": 154}, "userId": 2}	2026-01-07 08:51:09.462348
34	dev_admin_api_key_251104	set-balance	{"amount": 5443, "userId": 3}	2026-01-07 08:53:50.756301
35	dev_admin_api_key_251104	set-portfolio	{"assets": {"OP": 0.32, "BTC": 0, "AAVE": 0, "USDC": 27, "USDT": 154}, "userId": 2}	2026-01-10 02:32:26.653183
36	dev_admin_api_key_251104	set-balance	{"amount": 3442, "userId": 3}	2026-01-10 02:54:11.714598
37	dev_admin_api_key_251104	set-portfolio	{"assets": {"BTC": 0.04, "ETH": 0.98, "USDC": 355, "USDT": 157}, "userId": 3}	2026-01-10 02:55:07.099708
38	dev_admin_api_key_251104	set-balance	{"amount": 45322, "userId": 3}	2026-01-11 04:48:31.313664
39	dev_admin_api_key_251104	credit	{"amount": 500, "userId": 5, "currency": "USD", "reference": "admin-credit"}	2026-01-12 07:36:54.225856
40	dev_admin_api_key_251104	credit	{"amount": 500, "userId": 5, "currency": "USD", "reference": "admin-adjust-portfolio"}	2026-01-12 07:59:31.176801
41	dev_admin_api_key_251104	set-balance	{"amount": 500, "userId": 5}	2026-01-12 07:59:50.753083
42	dev_admin_api_key_251104	credit	{"amount": 500, "userId": 5, "currency": "USD", "reference": "admin-credit"}	2026-01-12 08:04:13.796908
43	dev_admin_api_key_251104	set-balance	{"amount": 500, "userId": 5}	2026-01-12 08:14:07.389745
\.


--
-- TOC entry 5303 (class 0 OID 24765)
-- Dependencies: 238
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_keys (id, user_id, key_hash, key_name, is_active, last_used_at, created_at, expires_at) FROM stdin;
\.


--
-- TOC entry 5319 (class 0 OID 24952)
-- Dependencies: 254
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, admin_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, status, error_message, created_at) FROM stdin;
\.


--
-- TOC entry 5286 (class 0 OID 24585)
-- Dependencies: 221
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, name, email, message, created_at) FROM stdin;
\.


--
-- TOC entry 5305 (class 0 OID 24789)
-- Dependencies: 240
-- Data for Name: deposit_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deposit_addresses (id, user_id, crypto_type, address, label, is_active, balance, total_received, created_at, last_activity_at) FROM stdin;
\.


--
-- TOC entry 5313 (class 0 OID 24880)
-- Dependencies: 248
-- Data for Name: exchange_rates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.exchange_rates (id, from_currency, to_currency, rate, source, "timestamp", created_at) FROM stdin;
\.


--
-- TOC entry 5315 (class 0 OID 24896)
-- Dependencies: 250
-- Data for Name: fee_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fee_config (id, fee_type, percentage_fee, flat_fee, minimum_amount, maximum_amount, currency, is_active, description, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5309 (class 0 OID 24830)
-- Dependencies: 244
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, notification_type, title, message, is_read, read_at, data, action_url, created_at) FROM stdin;
\.


--
-- TOC entry 5288 (class 0 OID 24595)
-- Dependencies: 223
-- Data for Name: portfolio; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.portfolio (id, user_id, btc_balance, eth_balance, usdt_balance, usdc_balance, xrp_balance, ada_balance, updated_at, usd_value) FROM stdin;
12	5	0.00365000	0.05475000	82.12500000	54.75000000	21.90000000	68.43750000	2026-01-13 08:19:34.494231	724.14864850
3	2	0.00000065	0.00030610	1919.64941432	1919.64941432	302.03878981	2004.40962137	2026-01-13 08:19:34.512458	5285.72088445
5	3	0.00000536	0.00175857	13898.97987564	13898.97987564	2081.29514000	19648.26499201	2026-01-13 08:19:34.515259	40139.70638399
1	1	593.00000000	0.00000000	0.00000000	0.00000000	0.00000000	0.00000000	2026-01-13 08:19:34.517796	55237357.00000000
\.


--
-- TOC entry 5307 (class 0 OID 24815)
-- Dependencies: 242
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_history (id, crypto_type, price_usd, market_cap, volume_24h, change_24h, "timestamp", created_at) FROM stdin;
\.


--
-- TOC entry 5311 (class 0 OID 24855)
-- Dependencies: 246
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, session_token, ip_address, user_agent, device_type, is_active, last_activity_at, created_at, expires_at) FROM stdin;
\.


--
-- TOC entry 5290 (class 0 OID 24609)
-- Dependencies: 225
-- Data for Name: testimonies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.testimonies (id, client_name, client_image, title, rating, content, is_featured, created_at, updated_at) FROM stdin;
1	John Smith	\N	CEO, Tech Ventures	5	ELON ULTRA ELONS has completely transformed my crypto trading experience. The platform is intuitive, secure, and I have increased my portfolio by 85% since joining. Highly recommended!	t	2026-01-06 07:06:30.875053	2026-01-06 07:06:30.875053
2	Sarah Johnson	\N	Entrepreneur	5	Best crypto trading platform I have used. The customer support is exceptional and the real-time market data is invaluable. Five stars!	t	2026-01-06 07:06:31.094934	2026-01-06 07:06:31.094934
3	Michael Chen	\N	Hedge Fund Manager	5	The real-time data and low fees make ELON ULTRA ELONS my go-to platform. Professional-grade tools at an unbeatable price point.	t	2026-01-06 07:06:31.099929	2026-01-06 07:06:31.099929
4	Emma Wilson	\N	Investment Advisor	5	Professional tools with a beginner-friendly interface. This platform has the perfect balance between power and simplicity.	f	2026-01-06 07:06:31.103928	2026-01-06 07:06:31.103928
5	David Martinez	\N	Day Trader	5	Faster execution than any other exchange I have used. I have saved thousands in fees since switching to ELON ULTRA ELONS.	f	2026-01-06 07:06:31.110427	2026-01-06 07:06:31.110427
6	Lisa Anderson	\N	Financial Advisor	5	I recommend ELON ULTRA ELONS to all my clients. The security is top-notch and the interface is incredibly user-friendly.	f	2026-01-06 07:06:31.111654	2026-01-06 07:06:31.111654
7	Robert Taylor	\N	Startup Founder	5	Trading on ELON ULTRA ELONS feels like using a professional-grade platform. Absolutely love the API documentation and support.	f	2026-01-06 07:06:31.11377	2026-01-06 07:06:31.11377
8	John Smith	\N	CEO, Tech Ventures	5	ELON ULTRA ELONS has completely transformed my crypto trading experience. The platform is intuitive, secure, and I have increased my portfolio by 85% since joining. Highly recommended!	t	2026-01-06 07:06:38.728417	2026-01-06 07:06:38.728417
9	Sarah Johnson	\N	Entrepreneur	5	Best crypto trading platform I have used. The customer support is exceptional and the real-time market data is invaluable. Five stars!	t	2026-01-06 07:06:38.846108	2026-01-06 07:06:38.846108
10	Michael Chen	\N	Hedge Fund Manager	5	The real-time data and low fees make ELON ULTRA ELONS my go-to platform. Professional-grade tools at an unbeatable price point.	t	2026-01-06 07:06:38.848213	2026-01-06 07:06:38.848213
11	Emma Wilson	\N	Investment Advisor	5	Professional tools with a beginner-friendly interface. This platform has the perfect balance between power and simplicity.	f	2026-01-06 07:06:38.851073	2026-01-06 07:06:38.851073
12	David Martinez	\N	Day Trader	5	Faster execution than any other exchange I have used. I have saved thousands in fees since switching to ELON ULTRA ELONS.	f	2026-01-06 07:06:38.852267	2026-01-06 07:06:38.852267
13	Lisa Anderson	\N	Financial Advisor	5	I recommend ELON ULTRA ELONS to all my clients. The security is top-notch and the interface is incredibly user-friendly.	f	2026-01-06 07:06:38.853216	2026-01-06 07:06:38.853216
14	Robert Taylor	\N	Startup Founder	5	Trading on ELON ULTRA ELONS feels like using a professional-grade platform. Absolutely love the API documentation and support.	f	2026-01-06 07:06:38.854305	2026-01-06 07:06:38.854305
\.


--
-- TOC entry 5292 (class 0 OID 24622)
-- Dependencies: 227
-- Data for Name: trades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trades (id, user_id, type, asset, amount, price, total, balance_before, balance_after, status, is_simulated, generated_at, created_at) FROM stdin;
1	2	buy	ADA	141.40000000	27787.93705926	3929214.30017897	5656.00000000	5756.14576792	completed	t	2026-01-12 01:19:54.86902	2026-01-12 01:19:54.86902
2	3	buy	BTC	1013.77500000	1658.54270740	1681389.13319286	40551.00000000	40818.22999885	completed	t	2026-01-12 01:19:54.926949	2026-01-12 01:19:54.926949
3	2	buy	MATIC	143.90364420	42385.04558641	6099362.51938217	5756.14576792	5803.18578475	completed	t	2026-01-12 01:21:57.234239	2026-01-12 01:21:57.234239
4	3	sell	USDT	1020.45574997	9689.90540916	9888119.69145320	40818.22999885	41731.97947374	completed	t	2026-01-12 01:21:57.314589	2026-01-12 01:21:57.314589
5	2	buy	XRP	145.07964462	36257.63670259	5260245.04752781	5803.18578475	5854.29046412	completed	t	2026-01-12 01:28:35.439775	2026-01-12 01:28:35.439775
6	3	sell	MATIC	1043.29948684	27497.81393771	28688455.17053361	41731.97947374	42191.18962797	completed	t	2026-01-12 01:28:35.453743	2026-01-12 01:28:35.453743
7	2	buy	BTC	146.35726160	39651.16789565	5803236.35256791	5854.29046412	5897.63702862	completed	t	2026-01-12 01:30:07.929272	2026-01-12 01:30:07.929272
8	3	sell	USDC	1054.77974070	4741.72031262	5001470.52181760	42191.18962797	42772.48978647	completed	t	2026-01-12 01:30:07.944653	2026-01-12 01:30:07.944653
9	2	sell	ADA	147.44092572	10415.27158476	1535637.28403560	5897.63702862	5930.96192302	completed	t	2026-01-12 01:36:18.318042	2026-01-12 01:36:18.318042
10	3	buy	XRP	1069.31224466	17256.75860918	18452863.28397002	42772.48978647	43669.32096447	completed	t	2026-01-12 01:36:18.382994	2026-01-12 01:36:18.382994
11	2	buy	ETH	148.27404808	34239.40687353	5076815.46084244	5930.96192302	6056.62604111	completed	t	2026-01-12 01:40:51.850236	2026-01-12 01:40:51.850236
12	3	sell	BTC	1091.73302411	37104.90616152	40508651.41309562	43669.32096447	43923.18684201	completed	t	2026-01-12 01:40:51.900966	2026-01-12 01:40:51.900966
13	2	sell	ETH	151.41565103	48641.88719990	7365143.01759142	6056.62604111	6102.55345434	completed	t	2026-01-12 01:48:38.291749	2026-01-12 01:48:38.291749
14	3	sell	ETH	1098.07967105	13365.04019945	14675878.94579049	43923.18684201	44801.84805644	completed	t	2026-01-12 01:48:38.31371	2026-01-12 01:48:38.31371
15	2	sell	SOL	152.56383636	45794.42656644	6986573.40081446	6102.55345434	6138.18144878	completed	t	2026-01-12 02:36:15.792109	2026-01-12 02:36:15.792109
16	3	buy	XRP	1120.04620141	24441.11474753	27375177.73122579	44801.84805644	45156.71490892	completed	t	2026-01-12 02:36:16.186453	2026-01-12 02:36:16.186453
17	2	buy	BTC	153.45453622	29113.56085804	4467607.97916945	6138.18144878	6207.97705206	completed	t	2026-01-12 03:44:07.873585	2026-01-12 03:44:07.873585
18	3	buy	ETH	1128.91787272	45113.81163790	50929788.26468246	45156.71490892	45715.98977093	completed	t	2026-01-12 03:44:07.953574	2026-01-12 03:44:07.953574
19	2	buy	SOL	155.19942630	42603.73702656	6612075.54482150	6207.97705206	6207.97705206	failed	t	2026-01-12 06:10:52.370277	2026-01-12 06:10:52.370277
20	3	buy	MATIC	1142.89974427	35200.14830590	40230240.49719676	45715.98977093	46775.87933647	completed	t	2026-01-12 06:10:52.44382	2026-01-12 06:10:52.44382
21	2	sell	MATIC	155.19942630	18932.72032834	2938347.33328563	6207.97705206	6283.58504111	completed	t	2026-01-12 06:31:44.129868	2026-01-12 06:31:44.129868
22	3	buy	MATIC	1169.39698341	35107.25031686	41054312.61641484	46775.87933647	47849.67683613	completed	t	2026-01-12 06:31:44.171472	2026-01-12 06:31:44.171472
23	2	buy	BTC	157.08962603	2062.57160191	324008.60159935	6283.58504111	6393.09087559	completed	t	2026-01-12 06:54:59.254802	2026-01-12 06:54:59.254802
24	3	sell	USDT	1196.24192090	32737.76121131	39162282.35748342	47849.67683613	48647.84165896	completed	t	2026-01-12 06:54:59.289678	2026-01-12 06:54:59.289678
25	2	buy	ADA	159.82727189	40944.34378558	6544022.76656450	6393.09087559	6467.23519160	completed	t	2026-01-12 06:55:10.066425	2026-01-12 06:55:10.066425
26	3	sell	BTC	1216.19604147	28470.27114961	34625431.07185056	48647.84165896	49030.30053419	completed	t	2026-01-12 06:55:10.080618	2026-01-12 06:55:10.080618
27	2	buy	ETH	161.68087979	20755.67281246	3355795.44095230	6467.23519160	6500.40710234	completed	t	2026-01-12 07:21:17.786355	2026-01-12 07:21:17.786355
28	3	sell	MATIC	1225.75751335	33340.32820402	40867157.79379172	49030.30053419	49030.30053419	failed	t	2026-01-12 07:21:17.818255	2026-01-12 07:21:17.818255
29	2	sell	XRP	162.51017756	15736.99188619	2557421.34566135	6500.40710234	6563.12407550	completed	t	2026-01-12 07:21:24.851285	2026-01-12 07:21:24.851285
30	3	buy	ADA	1225.75751335	40359.48148030	49470937.65957894	49030.30053419	49707.10134136	completed	t	2026-01-12 07:21:24.868886	2026-01-12 07:21:24.868886
31	2	allocate	BTC	0.00000065	54380.61221723	0.03530025	0.00000000	6672.71435924	completed	t	2026-01-12 08:10:16.913893	2026-01-12 08:10:16.913893
32	2	allocate	ETH	0.00030610	2504.24084821	0.76655942	0.00000000	6672.71435924	completed	t	2026-01-12 08:10:16.913893	2026-01-12 08:10:16.913893
33	2	allocate	USDT	1919.64941432	1.00000000	1919.64941432	0.00000000	6672.71435924	completed	t	2026-01-12 08:10:16.913893	2026-01-12 08:10:16.913893
34	2	allocate	USDC	1919.64941432	1.00000000	1919.64941432	0.00000000	6672.71435924	completed	t	2026-01-12 08:10:16.913893	2026-01-12 08:10:16.913893
35	2	allocate	XRP	302.03878981	2.52103921	761.45163074	0.00000000	6672.71435924	completed	t	2026-01-12 08:10:16.913893	2026-01-12 08:10:16.913893
36	2	allocate	ADA	2004.40962137	0.97862819	1961.57175645	0.00000000	6672.71435924	completed	t	2026-01-12 08:10:16.913893	2026-01-12 08:10:16.913893
37	3	allocate	BTC	0.00000536	50926.24294879	0.27292372	0.00000000	50572.93078006	completed	t	2026-01-12 08:10:16.973701	2026-01-12 08:10:16.973701
38	3	allocate	ETH	0.00175857	2811.32689296	4.94392164	0.00000000	50572.93078006	completed	t	2026-01-12 08:10:16.973701	2026-01-12 08:10:16.973701
39	3	allocate	USDT	13898.97987564	1.00000000	13898.97987564	0.00000000	50572.93078006	completed	t	2026-01-12 08:10:16.973701	2026-01-12 08:10:16.973701
40	3	allocate	USDC	13898.97987564	1.00000000	13898.97987564	0.00000000	50572.93078006	completed	t	2026-01-12 08:10:16.973701	2026-01-12 08:10:16.973701
41	3	allocate	XRP	2081.29514000	2.58419111	5378.46439666	0.00000000	50572.93078006	completed	t	2026-01-12 08:10:16.973701	2026-01-12 08:10:16.973701
42	3	allocate	ADA	19648.26499201	0.84106461	16525.46034805	0.00000000	50572.93078006	completed	t	2026-01-12 08:10:16.973701	2026-01-12 08:10:16.973701
43	5	allocate	BTC	0.00000013	45908.92522191	0.00618981	0.00000000	1018.62107514	completed	t	2026-01-12 08:10:16.987684	2026-01-12 08:10:16.987684
44	5	allocate	ETH	0.00003858	2714.05565657	0.10470225	0.00000000	1018.62107514	completed	t	2026-01-12 08:10:16.987684	2026-01-12 08:10:16.987684
45	5	allocate	USDT	284.16772788	1.00000000	284.16772788	0.00000000	1018.62107514	completed	t	2026-01-12 08:10:16.987684	2026-01-12 08:10:16.987684
46	5	allocate	USDC	284.16772788	1.00000000	284.16772788	0.00000000	1018.62107514	completed	t	2026-01-12 08:10:16.987684	2026-01-12 08:10:16.987684
47	5	allocate	XRP	44.26027654	2.53384658	112.14875041	0.00000000	1018.62107514	completed	t	2026-01-12 08:10:16.987684	2026-01-12 08:10:16.987684
48	5	allocate	ADA	359.01153177	0.88967867	319.40490176	0.00000000	1018.62107514	completed	t	2026-01-12 08:10:16.987684	2026-01-12 08:10:16.987684
49	5	simulated	PROFIT	47.50000000	1.00000000	47.50000000	500.00000000	547.50000000	completed	t	2026-01-13 07:55:03.617155	2026-01-13 07:55:03.617155
\.


--
-- TOC entry 5294 (class 0 OID 24641)
-- Dependencies: 229
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, user_id, type, amount, currency, status, reference, created_at, updated_at) FROM stdin;
43	3	trade	2433.00000000	USD	completed	manual-admin-1768211378590	2026-01-12 01:49:38.391	2026-01-12 01:49:38.590565
46	5	adjustment	500.00000000	USD	completed	admin-set-balance	2026-01-12 07:59:50.753083	2026-01-12 07:59:50.753083
47	5	deposit	500.00000000	USD	completed	admin-credit	2026-01-12 08:04:13.796908	2026-01-12 08:04:13.796908
48	5	adjustment	500.00000000	USD	completed	admin-set-balance	2026-01-12 08:14:07.389745	2026-01-12 08:14:07.389745
\.


--
-- TOC entry 5301 (class 0 OID 24742)
-- Dependencies: 236
-- Data for Name: user_kyc; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_kyc (id, user_id, verification_status, document_type, document_number, first_name, last_name, date_of_birth, nationality, address, city, state, postal_code, country, document_front_url, document_back_url, selfie_url, submitted_at, verified_at, rejected_reason, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5317 (class 0 OID 24918)
-- Dependencies: 252
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_settings (id, user_id, theme, language, two_factor_enabled, two_factor_method, email_notifications, push_notifications, sms_notifications, withdrawal_notifications, trading_notifications, security_alerts, marketing_emails, timezone, currency_display, show_portfolio_value, auto_logout_minutes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5296 (class 0 OID 24653)
-- Dependencies: 231
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, created_at, updated_at, balance, portfolio_value, phone, sim_enabled, sim_paused, sim_next_run_at, sim_last_run_at, sim_started_at, tax_id, is_active, deleted_at) FROM stdin;
5	Andy Pat	patandy532@gmail.com	$2b$10$eHR8z.qUyVza81A7TIbaCezk7D7B8p/hVDd7Zwd9Ry7ltR44nA.N2	2026-01-12 03:44:35.666453	2026-01-13 08:19:34.499874	547.50000000	724.14864850	+16257389285	t	f	2026-01-13 08:55:03.617155	2026-01-13 07:55:03.617155	2026-01-13 07:49:25.868064	\N	t	\N
2	Peter Eny	peterpen@gmail.com	$2b$10$63dBNmubn6snBlihDgcvOuDgB58k.nVWtdLzQNvbPQVYETs0enMEG	2026-01-02 02:32:55.6684	2026-01-13 08:19:34.513865	6672.71435924	5285.72088445	\N	f	f	\N	\N	\N	\N	t	\N
3	Mike Tur	mikey@gmail.com	$2b$10$/78TegoMY0FYS1ZIcRDd7uwYoxXfQajGF1FCuX6uJCu1kL.0a7Jf.	2026-01-02 03:03:28.940104	2026-01-13 08:19:34.516541	50572.93078006	40139.70638399	\N	f	f	\N	\N	\N	\N	t	\N
1	Clara Nancy	claranancy700@gmail.com	$2b$10$kMtqwryewC5Sf6c6S5VRT.Jfnb9HZzYfXjmTcCJPzOcbda4VAfo1u	2026-01-02 02:19:19.485412	2026-01-13 08:19:34.519116	0.00000000	55237357.00000000	\N	f	f	\N	\N	\N	\N	t	\N
\.


--
-- TOC entry 5298 (class 0 OID 24669)
-- Dependencies: 233
-- Data for Name: withdrawals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.withdrawals (id, user_id, amount, crypto_type, crypto_address, status, txn_hash, error_message, created_at, processed_at) FROM stdin;
1	3	300.00000000	USDT	0xd36e85873f91120785D3090Af4fE00d1050720c0	pending	\N	\N	2026-01-11 04:17:57.305991	\N
2	3	425.00000000	USDT	0xd36e85873f91120785D3090Af4fE00d1050720c0	pending	\N	\N	2026-01-11 04:27:16.637279	\N
3	3	243.00000000	USDT	0xd36e85873f91120785D3090Af4fE00d1050720c0	pending	\N	\N	2026-01-11 04:28:30.127754	\N
4	3	2323.00000000	USDT	0xd36e85873f91120785D3090Af4fE00d1050720c0	pending	\N	\N	2026-01-11 04:40:20.496951	\N
5	3	434.00000000	USDT	0xd36e85873f91120785D3090Af4fE00d1050720c0	pending	\N	\N	2026-01-11 04:49:13.934919	\N
6	3	234.00000000	USDT	0xd36e85873f91120785D3090Af4fE00d1050720c0	pending	\N	\N	2026-01-11 07:12:25.749593	\N
7	3	354.00000000	USDT	0xd36e85873f91120785D3090Af4fE00d1050720c0	pending	\N	\N	2026-01-11 07:13:55.695213	\N
8	3	325.00000000	USDT	0xd36e85873f91120785D3090Af4fE00d1050720c0	pending	\N	\N	2026-01-11 07:17:54.132228	\N
9	3	3424.00000000	USDT	0xd36e85873f91120785D3090Af4fE00d1050720c0	pending	\N	\N	2026-01-11 07:46:58.739874	\N
\.


--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 220
-- Name: admin_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_audit_id_seq', 43, true);


--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 237
-- Name: api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.api_keys_id_seq', 1, false);


--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 253
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 1, false);


--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 222
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contacts_id_seq', 1, false);


--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 239
-- Name: deposit_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deposit_addresses_id_seq', 1, false);


--
-- TOC entry 5338 (class 0 OID 0)
-- Dependencies: 247
-- Name: exchange_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.exchange_rates_id_seq', 1, false);


--
-- TOC entry 5339 (class 0 OID 0)
-- Dependencies: 249
-- Name: fee_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fee_config_id_seq', 1, false);


--
-- TOC entry 5340 (class 0 OID 0)
-- Dependencies: 243
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- TOC entry 5341 (class 0 OID 0)
-- Dependencies: 224
-- Name: portfolio_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.portfolio_id_seq', 35, true);


--
-- TOC entry 5342 (class 0 OID 0)
-- Dependencies: 241
-- Name: price_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_history_id_seq', 1, false);


--
-- TOC entry 5343 (class 0 OID 0)
-- Dependencies: 245
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- TOC entry 5344 (class 0 OID 0)
-- Dependencies: 226
-- Name: testimonies_id_seq1; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.testimonies_id_seq1', 14, true);


--
-- TOC entry 5345 (class 0 OID 0)
-- Dependencies: 228
-- Name: trades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trades_id_seq', 49, true);


--
-- TOC entry 5346 (class 0 OID 0)
-- Dependencies: 230
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 48, true);


--
-- TOC entry 5347 (class 0 OID 0)
-- Dependencies: 235
-- Name: user_kyc_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_kyc_id_seq', 1, false);


--
-- TOC entry 5348 (class 0 OID 0)
-- Dependencies: 251
-- Name: user_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_settings_id_seq', 1, false);


--
-- TOC entry 5349 (class 0 OID 0)
-- Dependencies: 232
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- TOC entry 5350 (class 0 OID 0)
-- Dependencies: 234
-- Name: withdrawals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.withdrawals_id_seq', 9, true);


--
-- TOC entry 5034 (class 2606 OID 24692)
-- Name: admin_audit admin_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_audit
    ADD CONSTRAINT admin_audit_pkey PRIMARY KEY (id);


--
-- TOC entry 5070 (class 2606 OID 24779)
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- TOC entry 5072 (class 2606 OID 24777)
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- TOC entry 5119 (class 2606 OID 24962)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5036 (class 2606 OID 24694)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 5077 (class 2606 OID 24804)
-- Name: deposit_addresses deposit_addresses_address_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposit_addresses
    ADD CONSTRAINT deposit_addresses_address_key UNIQUE (address);


--
-- TOC entry 5079 (class 2606 OID 24802)
-- Name: deposit_addresses deposit_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposit_addresses
    ADD CONSTRAINT deposit_addresses_pkey PRIMARY KEY (id);


--
-- TOC entry 5104 (class 2606 OID 24891)
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- TOC entry 5109 (class 2606 OID 24915)
-- Name: fee_config fee_config_fee_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_config
    ADD CONSTRAINT fee_config_fee_type_key UNIQUE (fee_type);


--
-- TOC entry 5111 (class 2606 OID 24913)
-- Name: fee_config fee_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_config
    ADD CONSTRAINT fee_config_pkey PRIMARY KEY (id);


--
-- TOC entry 5094 (class 2606 OID 24844)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5040 (class 2606 OID 24696)
-- Name: portfolio portfolio_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio
    ADD CONSTRAINT portfolio_pkey PRIMARY KEY (id);


--
-- TOC entry 5042 (class 2606 OID 24698)
-- Name: portfolio portfolio_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio
    ADD CONSTRAINT portfolio_user_id_key UNIQUE (user_id);


--
-- TOC entry 5088 (class 2606 OID 24825)
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- TOC entry 5100 (class 2606 OID 24867)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5102 (class 2606 OID 24869)
-- Name: sessions sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_session_token_key UNIQUE (session_token);


--
-- TOC entry 5044 (class 2606 OID 24700)
-- Name: testimonies testimonies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testimonies
    ADD CONSTRAINT testimonies_pkey PRIMARY KEY (id);


--
-- TOC entry 5050 (class 2606 OID 24702)
-- Name: trades trades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- TOC entry 5052 (class 2606 OID 24704)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5066 (class 2606 OID 24754)
-- Name: user_kyc user_kyc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_pkey PRIMARY KEY (id);


--
-- TOC entry 5068 (class 2606 OID 24756)
-- Name: user_kyc user_kyc_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_user_id_key UNIQUE (user_id);


--
-- TOC entry 5115 (class 2606 OID 24942)
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5117 (class 2606 OID 24944)
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


--
-- TOC entry 5055 (class 2606 OID 24706)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5057 (class 2606 OID 24708)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5062 (class 2606 OID 24710)
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- TOC entry 5073 (class 1259 OID 24787)
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (is_active);


--
-- TOC entry 5074 (class 1259 OID 24786)
-- Name: idx_api_keys_key_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- TOC entry 5075 (class 1259 OID 24785)
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- TOC entry 5120 (class 1259 OID 24977)
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- TOC entry 5121 (class 1259 OID 24974)
-- Name: idx_audit_logs_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs USING btree (admin_id);


--
-- TOC entry 5122 (class 1259 OID 24976)
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- TOC entry 5123 (class 1259 OID 24975)
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- TOC entry 5124 (class 1259 OID 24973)
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- TOC entry 5037 (class 1259 OID 24711)
-- Name: idx_contacts_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_email ON public.contacts USING btree (email);


--
-- TOC entry 5080 (class 1259 OID 24813)
-- Name: idx_deposit_addresses_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deposit_addresses_active ON public.deposit_addresses USING btree (is_active);


--
-- TOC entry 5081 (class 1259 OID 24812)
-- Name: idx_deposit_addresses_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deposit_addresses_address ON public.deposit_addresses USING btree (address);


--
-- TOC entry 5082 (class 1259 OID 24811)
-- Name: idx_deposit_addresses_crypto_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deposit_addresses_crypto_type ON public.deposit_addresses USING btree (crypto_type);


--
-- TOC entry 5083 (class 1259 OID 24810)
-- Name: idx_deposit_addresses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deposit_addresses_user_id ON public.deposit_addresses USING btree (user_id);


--
-- TOC entry 5105 (class 1259 OID 24894)
-- Name: idx_exchange_rates_latest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_exchange_rates_latest ON public.exchange_rates USING btree (from_currency, to_currency, "timestamp" DESC);


--
-- TOC entry 5106 (class 1259 OID 24892)
-- Name: idx_exchange_rates_pair; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exchange_rates_pair ON public.exchange_rates USING btree (from_currency, to_currency);


--
-- TOC entry 5107 (class 1259 OID 24893)
-- Name: idx_exchange_rates_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exchange_rates_timestamp ON public.exchange_rates USING btree ("timestamp" DESC);


--
-- TOC entry 5112 (class 1259 OID 24916)
-- Name: idx_fee_config_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fee_config_active ON public.fee_config USING btree (is_active);


--
-- TOC entry 5089 (class 1259 OID 24852)
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- TOC entry 5090 (class 1259 OID 24851)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- TOC entry 5091 (class 1259 OID 24850)
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- TOC entry 5092 (class 1259 OID 24853)
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- TOC entry 5084 (class 1259 OID 24828)
-- Name: idx_price_history_crypto_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_price_history_crypto_timestamp ON public.price_history USING btree (crypto_type, "timestamp" DESC);


--
-- TOC entry 5085 (class 1259 OID 24826)
-- Name: idx_price_history_crypto_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_price_history_crypto_type ON public.price_history USING btree (crypto_type);


--
-- TOC entry 5086 (class 1259 OID 24827)
-- Name: idx_price_history_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_price_history_timestamp ON public.price_history USING btree ("timestamp" DESC);


--
-- TOC entry 5095 (class 1259 OID 24877)
-- Name: idx_sessions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_active ON public.sessions USING btree (is_active);


--
-- TOC entry 5096 (class 1259 OID 24878)
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- TOC entry 5097 (class 1259 OID 24876)
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (session_token);


--
-- TOC entry 5098 (class 1259 OID 24875)
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- TOC entry 5045 (class 1259 OID 24712)
-- Name: idx_trades_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trades_created_at ON public.trades USING btree (created_at DESC);


--
-- TOC entry 5046 (class 1259 OID 24713)
-- Name: idx_trades_is_simulated; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trades_is_simulated ON public.trades USING btree (is_simulated);


--
-- TOC entry 5047 (class 1259 OID 24714)
-- Name: idx_trades_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trades_user_date ON public.trades USING btree (user_id, created_at DESC);


--
-- TOC entry 5048 (class 1259 OID 24715)
-- Name: idx_trades_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_trades_user_id ON public.trades USING btree (user_id);


--
-- TOC entry 5063 (class 1259 OID 24762)
-- Name: idx_user_kyc_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_kyc_status ON public.user_kyc USING btree (verification_status);


--
-- TOC entry 5064 (class 1259 OID 24763)
-- Name: idx_user_kyc_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_kyc_user_id ON public.user_kyc USING btree (user_id);


--
-- TOC entry 5038 (class 1259 OID 24716)
-- Name: idx_user_portfolio; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_portfolio ON public.portfolio USING btree (user_id);


--
-- TOC entry 5113 (class 1259 OID 24950)
-- Name: idx_user_settings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_settings_user_id ON public.user_settings USING btree (user_id);


--
-- TOC entry 5058 (class 1259 OID 24717)
-- Name: idx_user_withdrawals; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_withdrawals ON public.withdrawals USING btree (user_id);


--
-- TOC entry 5053 (class 1259 OID 24718)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 5059 (class 1259 OID 24719)
-- Name: idx_withdrawals_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_withdrawals_status ON public.withdrawals USING btree (status);


--
-- TOC entry 5060 (class 1259 OID 24720)
-- Name: idx_withdrawals_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_withdrawals_user_id ON public.withdrawals USING btree (user_id);


--
-- TOC entry 5130 (class 2606 OID 24780)
-- Name: api_keys fk_api_keys_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT fk_api_keys_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5135 (class 2606 OID 24968)
-- Name: audit_logs fk_audit_logs_admin_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_admin_id FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5136 (class 2606 OID 24963)
-- Name: audit_logs fk_audit_logs_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5131 (class 2606 OID 24805)
-- Name: deposit_addresses fk_deposit_addresses_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposit_addresses
    ADD CONSTRAINT fk_deposit_addresses_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5132 (class 2606 OID 24845)
-- Name: notifications fk_notifications_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5133 (class 2606 OID 24870)
-- Name: sessions fk_sessions_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5129 (class 2606 OID 24757)
-- Name: user_kyc fk_user_kyc_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT fk_user_kyc_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5134 (class 2606 OID 24945)
-- Name: user_settings fk_user_settings_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT fk_user_settings_user_id FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5125 (class 2606 OID 24721)
-- Name: portfolio portfolio_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio
    ADD CONSTRAINT portfolio_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5126 (class 2606 OID 24726)
-- Name: trades trades_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5127 (class 2606 OID 24731)
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5128 (class 2606 OID 24736)
-- Name: withdrawals withdrawals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-03-23 07:32:30

--
-- PostgreSQL database dump complete
--

\unrestrict AECqe8SoWNyj0GYSy2Zj6xRXa9TTwuIrhjRWGBm7H23OcKKxomzTpU8ZVjXz852

