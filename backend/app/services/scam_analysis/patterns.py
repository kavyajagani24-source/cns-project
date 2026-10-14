"""High precision social-engineering signals; phrases alone are not proof of fraud."""
from dataclasses import dataclass

@dataclass(frozen=True)
class Rule:
    code: str
    label: str
    expression: str
    weight: int
    category: str
    explanation: str

RULES = [
    Rule("authority_government", "Government authority claim", r"\b(?:irs|social security administration|police|fbi|tax department|customs officer)\b", 13, "Government impersonation", "Claims to represent a government authority."),
    Rule("authority_bank", "Financial institution claim", r"\b(?:fraud department|bank security|bank representative|your bank|credit union)\b", 12, "Banking / OTP", "Claims to represent a financial institution."),
    Rule("authority_tech", "Technical support claim", r"\b(?:microsoft support|apple support|technical support|security technician|windows support)\b", 12, "Tech support", "Claims technical-support authority."),
    Rule("delivery", "Parcel delivery pretext", r"\b(?:fedex|ups|usps|dhl|parcel|package delivery|delivery failed|package on hold)\b", 12, "Delivery scam", "Uses a delivery-related pretext."),
    Rule("threat", "Threat or punishment", r"\b(?:arrest(?:ed)?|lawsuit|legal action|warrant|deport(?:ation|ed)?|criminal charges|police will come)\b", 23, "Government impersonation", "Uses threats or intimidation."),
    Rule("urgency", "Time pressure", r"\b(?:within \d+ (?:minutes?|hours?)|immediately|right now|urgent(?:ly)?|final warning|last chance|today only|act now)\b", 13, "General social engineering", "Creates urgency to reduce independent verification."),
    Rule("account_lock", "Account access threat", r"\b(?:account (?:will be |is )?(?:locked|suspended|frozen)|security alert|unauthorized transaction)\b", 14, "Banking / OTP", "Uses an account-access or security-alert pretext."),
    Rule("gift_cards", "Gift-card payment", r"\b(?:gift cards?|itunes cards?|google play cards?|steam cards?)\b", 28, "Payment coercion", "Requests or mentions non-reversible gift-card payments."),
    Rule("crypto", "Cryptocurrency payment", r"\b(?:bitcoin atm|crypto atm|bitcoin wallet|send (?:bitcoin|crypto)|pay (?:in|with) (?:bitcoin|crypto))\b", 27, "Payment coercion", "References hard-to-reverse cryptocurrency payments."),
    Rule("transfer", "Person-to-person money transfer", r"\b(?:zelle|venmo|wire transfer|western union|cash app|bank transfer)\b", 17, "Payment coercion", "References a transfer channel often used in payment scams."),
    Rule("otp", "Verification code request", r"\b(?:(?:send|share|provide|tell|read|give|reply with) (?:me |us |your |the )?(?:one.time (?:password|code)|otp|verification code|security code|6.digit code)|(?:otp|verification code) (?:to|with) (?:me|us))\b", 35, "Banking / OTP", "Requests disclosure of a security verification code."),
    Rule("password", "Password / PIN disclosure", r"\b(?:(?:send|share|provide|tell|give|reply with) (?:me |us |your |the )?(?:password|pin|login credentials)|confirm your password)\b", 34, "Credential harvesting", "Requests a sensitive authentication secret."),
    Rule("remote_tool", "Remote access tool", r"\b(?:anydesk|teamviewer|quick assist|quicksupport|ultraviewer|rustdesk)\b", 18, "Tech support", "Mentions software capable of granting remote access."),
    Rule("remote_instruction", "Remote access instruction", r"\b(?:install|download|open|run|enable|allow|grant|share (?:your )?screen|remote access|screen sharing)\b", 15, "Tech support", "Instructs the recipient to install software or grant access."),
    Rule("link", "Follow external link", r"\b(?:click|tap|visit|open|follow) (?:on |the |this )?(?:link|url|website)\b", 8, "General social engineering", "Prompts the recipient to follow an external link."),
    Rule("secrecy", "Secrecy instruction", r"\b(?:do not tell anyone|keep this secret|don't contact your bank|do not hang up|stay on the line|don't tell the police)\b", 26, "General social engineering", "Attempts to prevent independent verification."),
]

MITIGATIONS = {
    "Government impersonation": ["Do not pay or share identification details.", "Contact the agency through its independently verified official website or phone number."],
    "Banking / OTP": ["Never share an OTP, PIN, or password with someone who contacted you.", "Contact your bank using the number on your card or its official app; review account activity."],
    "Tech support": ["Do not install remote-access applications at a stranger's request.", "If access was granted, disconnect the device from the internet and seek trusted technical help; change credentials from a clean device."],
    "Delivery scam": ["Check shipment status directly through the carrier's official website or app.", "Do not pay unexpected redelivery fees through message links."],
    "Payment coercion": ["Do not send gift-card codes, crypto, or irreversible transfers.", "If money was sent, immediately contact your payment provider and report suspected fraud."],
    "Credential harvesting": ["Do not disclose passwords or PINs.", "If you already shared credentials, change them through the official service and enable multi-factor authentication."],
    "General social engineering": ["Pause and verify the request through a known, independent contact channel.", "Do not follow unsolicited links or share sensitive information."],
}
