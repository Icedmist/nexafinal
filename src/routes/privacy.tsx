import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import nexaLogo from "@/assets/nexa-logo.svg";
import { useEffect } from "react";

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A1F44] text-white selection:bg-[#00C2FF]/30 font-sans pb-20">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A1F44]/95 backdrop-blur-xl border-b border-white/5 shadow-lg px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-[#00C2FF]/10 rounded-2xl p-2 border border-[#00C2FF]/20 transition-transform group-hover:rotate-12">
              <img src={nexaLogo} className="h-8 w-8 invert brightness-0" alt="NEXA Logo" />
            </div>
            <span className="text-xl font-black font-['Montserrat',sans-serif] text-white tracking-tight uppercase italic">
              NEXA Store OS
            </span>
          </Link>

          <Link to="/">
            <Button variant="ghost" className="font-bold text-sm text-slate-200 hover:text-white rounded-xl gap-2 hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Header section */}
      <div className="relative pt-32 pb-12 overflow-hidden bg-gradient-to-b from-[#0A1C2D] to-[#0A1F44] text-center px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00C2FF]/5 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#1A73E8]/5 blur-[150px]" />
        </div>

        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/5 px-4 py-1.5">
            <ShieldCheck className="h-4 w-4 text-[#00C2FF]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00C2FF]">Privacy Commitment</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-['Montserrat',sans-serif] tracking-tight uppercase italic text-white">
            Privacy Policy
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Effective Date: 4 June 2026
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden text-left">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#00C2FF]/5 to-transparent pointer-events-none" />
          
          <div className="space-y-10 relative z-10 text-slate-300 text-sm md:text-base leading-relaxed font-medium">
            <p className="text-slate-200 border-b border-white/5 pb-6">
              At Nexa Digital Solutions Ltd, we value your privacy. This Privacy Policy explains how we collect, use, process, and safeguard your business and personal information when you use NEXAOS or NEXA Vendors.
            </p>

            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>1.</span> INTRODUCTION
              </h2>
              <p>
                This Privacy Policy describes our practices regarding information collected through our website, mobile application, WhatsApp integrations, and other platform services. By using our platform, you consent to our practices as described in this policy.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>2.</span> INFORMATION WE COLLECT
              </h2>
              <p>We collect information to provide and improve our services, including:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li><strong className="text-white">Account Information:</strong> Name, work email address, phone number, passwords, and profile metadata.</li>
                <li><strong className="text-white">Business Data:</strong> Inventory listings, sales records, product catalogs, customer transaction details, and billing details.</li>
                <li><strong className="text-white">Integration Data:</strong> WhatsApp numbers, API keys, and notification logs for transaction dispatching.</li>
                <li><strong className="text-white">Technical Data:</strong> IP addresses, browser types, operating systems, and platform interaction logs.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>3.</span> HOW WE USE YOUR INFORMATION
              </h2>
              <p>We process your information for the following business purposes:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Provisioning and maintaining your NEXAOS store profile.</li>
                <li>Generating sales reports, analytics, and business insights.</li>
                <li>Processing transactions and verifying payments through integrated gateways (e.g. Monnify, Paystack).</li>
                <li>Sending daily summaries, low-stock warnings, and transaction receipts via WhatsApp, SMS, or email.</li>
                <li>Ensuring security, debugging platform faults, and preventing fraudulent activities.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>4.</span> DATA SHARING AND DISCLOSURE
              </h2>
              <p>
                <strong className="text-[#FFB800]">We do NOT sell, rent, or trade your personal or business data to third parties.</strong>
              </p>
              <p>We may share limited data only under the following conditions:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li><strong className="text-white">Service Providers:</strong> With trusted infrastructure partners (hosting, payment processors, WhatsApp API providers) strictly necessary to run the platform.</li>
                <li><strong className="text-white">Legal Obligations:</strong> When required by Nigerian laws or valid legal processes.</li>
                <li><strong className="text-white">Business Transfers:</strong> In connection with any merger, sale of assets, or acquisition, with strict confidentiality agreements.</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>5.</span> DATA SECURITY
              </h2>
              <p>
                We use industry-standard encryption, firewalls, and secure socket layers (SSL) to protect your business information. While we take maximum precautions, no transmission over the Internet can be guaranteed 100% secure, and you are responsible for maintaining your account credentials confidentially.
              </p>
            </div>

            {/* Section 6 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>6.</span> DATA RETENTION
              </h2>
              <p>
                We retain your business records and data for as long as your account is active or as required to comply with our legal, accounting, or regulatory requirements. If you terminate your account, we will delete or anonymize your data within a reasonable period, except where prohibited by law.
              </p>
            </div>

            {/* Section 7 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>7.</span> YOUR CHOICES AND RIGHTS
              </h2>
              <p>Depending on your jurisdiction, you have the right to:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Access, correct, or update your account details directly in the dashboard.</li>
                <li>Opt-out or manage preferences for WhatsApp alerts, emails, and notifications.</li>
                <li>Request a portable export of your store sales and inventory data.</li>
                <li>Request account deletion and data scrubbing.</li>
              </ul>
            </div>

            {/* Section 8 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>8.</span> THIRD-PARTY SERVICES AND INTEGRATIONS
              </h2>
              <p>
                Our services integrate payment gateways (Monnify, Paystack) and communication utilities. These providers operate under their own privacy policies, which we encourage you to review.
              </p>
            </div>

            {/* Section 9 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>9.</span> CHANGES TO THIS PRIVACY POLICY
              </h2>
              <p>
                We reserve the right to modify this Privacy Policy at any time. When updates occur, we will adjust the "Effective Date" at the top. We will notify you of major updates via email, in-platform notifications, or WhatsApp alerts.
              </p>
            </div>

            {/* Section 10 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>10.</span> CONTACT US
              </h2>
              <p>If you have any questions about this Privacy Policy or your data rights, please contact us:</p>
              <div className="mt-2 p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1.5 font-mono text-xs md:text-sm">
                <p><span className="text-[#00C2FF]">Company:</span> Nexa Digital Solutions Ltd</p>
                <p><span className="text-[#00C2FF]">Email:</span> nexatechnologies.dev@gmail.com</p>
                <p><span className="text-[#00C2FF]">Phone:</span> +234 903 802 6109</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
