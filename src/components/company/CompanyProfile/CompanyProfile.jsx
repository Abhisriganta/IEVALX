import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel,
  Alert, CircularProgress, IconButton, InputAdornment, Stack, Paper, Chip, Autocomplete,
  FormHelperText, Tabs, Tab, Avatar, Tooltip, useMediaQuery, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Fade,
} from '@mui/material';
import {
  Visibility, VisibilityOff, CheckCircle, Edit, Close, Lock,
  Business, Person, LocationOn, Language, Description, Shield,
  InsertDriveFile, CloudUpload, Delete, Save, Cancel as CancelIcon, OpenInNew,
  HourglassEmpty, Cancel, Verified,
} from '@mui/icons-material';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyProfile,useDocuments,useDocumentVerificationStatus, } from '@/hooks/company/useCompanyProfile';

/* ════════════════════════════════════════════════════════════════════════════
 *  CONSTANTS
 * ════════════════════════════════════════════════════════════════════════════ */

const INDUSTRY_TYPES = [
  'IT Services', 'Software Product', 'BFSI', 'Healthcare', 'E-Commerce',
  'Manufacturing', 'Education', 'Consulting', 'Logistics', 'Media & Entertainment',
  'Real Estate', 'Retail', 'Telecom', 'Automotive', 'Government', 'Other',
];
const EMPLOYEE_RANGES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
const DEPARTMENTS = [
  'Engineering', 'Human Resources', 'Talent Acquisition', 'Operations',
  'Sales', 'Marketing', 'Finance', 'Product', 'Design', 'Customer Success',
  'Legal', 'Administration', 'Other',
];
const COUNTRY_CODES = [
  { code: '+91',   label: '🇮🇳 +91   India',                    min: 10, max: 10 },
  { code: '+1',    label: '🇺🇸 +1    USA / Canada',             min: 10, max: 10 },
  { code: '+44',   label: '🇬🇧 +44   UK',                       min: 10, max: 11 },
  { code: '+971',  label: '🇦🇪 +971  UAE',                      min: 7,  max: 9  },
  { code: '+65',   label: '🇸🇬 +65   Singapore',                min: 8,  max: 8  },
  { code: '+61',   label: '🇦🇺 +61   Australia',                min: 9,  max: 9  },
  { code: '+81',   label: '🇯🇵 +81   Japan',                    min: 10, max: 11 },
  { code: '+86',   label: '🇨🇳 +86   China',                    min: 11, max: 11 },
  { code: '+49',   label: '🇩🇪 +49   Germany',                  min: 10, max: 11 },
  { code: '+33',   label: '🇫🇷 +33   France',                   min: 9,  max: 9  },
  { code: '+7',    label: '🇷🇺 +7    Russia',                   min: 10, max: 10 },
  { code: '+55',   label: '🇧🇷 +55   Brazil',                   min: 10, max: 11 },
  { code: '+52',   label: '🇲🇽 +52   Mexico',                   min: 10, max: 10 },
  { code: '+34',   label: '🇪🇸 +34   Spain',                    min: 9,  max: 9  },
  { code: '+39',   label: '🇮🇹 +39   Italy',                    min: 9,  max: 10 },
  { code: '+31',   label: '🇳🇱 +31   Netherlands',              min: 9,  max: 9  },
  { code: '+46',   label: '🇸🇪 +46   Sweden',                   min: 9,  max: 10 },
  { code: '+47',   label: '🇳🇴 +47   Norway',                   min: 8,  max: 8  },
  { code: '+45',   label: '🇩🇰 +45   Denmark',                  min: 8,  max: 8  },
  { code: '+358',  label: '🇫🇮 +358  Finland',                  min: 9,  max: 10 },
  { code: '+48',   label: '🇵🇱 +48   Poland',                   min: 9,  max: 9  },
  { code: '+41',   label: '🇨🇭 +41   Switzerland',              min: 9,  max: 9  },
  { code: '+43',   label: '🇦🇹 +43   Austria',                  min: 10, max: 11 },
  { code: '+32',   label: '🇧🇪 +32   Belgium',                  min: 9,  max: 9  },
  { code: '+351',  label: '🇵🇹 +351  Portugal',                 min: 9,  max: 9  },
  { code: '+353',  label: '🇮🇪 +353  Ireland',                  min: 9,  max: 9  },
  { code: '+30',   label: '🇬🇷 +30   Greece',                   min: 10, max: 10 },
  { code: '+420',  label: '🇨🇿 +420  Czech Republic',           min: 9,  max: 9  },
  { code: '+36',   label: '🇭🇺 +36   Hungary',                  min: 9,  max: 9  },
  { code: '+40',   label: '🇷🇴 +40   Romania',                  min: 9,  max: 10 },
  { code: '+380',  label: '🇺🇦 +380  Ukraine',                  min: 9,  max: 9  },
  { code: '+90',   label: '🇹🇷 +90   Turkey',                   min: 10, max: 10 },
  { code: '+966',  label: '🇸🇦 +966  Saudi Arabia',             min: 9,  max: 9  },
  { code: '+974',  label: '🇶🇦 +974  Qatar',                    min: 7,  max: 8  },
  { code: '+968',  label: '🇴🇲 +968  Oman',                     min: 8,  max: 8  },
  { code: '+973',  label: '🇧🇭 +973  Bahrain',                  min: 8,  max: 8  },
  { code: '+965',  label: '🇰🇼 +965  Kuwait',                   min: 8,  max: 8  },
  { code: '+962',  label: '🇯🇴 +962  Jordan',                   min: 9,  max: 9  },
  { code: '+961',  label: '🇱🇧 +961  Lebanon',                  min: 7,  max: 8  },
  { code: '+972',  label: '🇮🇱 +972  Israel',                   min: 9,  max: 10 },
  { code: '+20',   label: '🇪🇬 +20   Egypt',                    min: 10, max: 10 },
  { code: '+27',   label: '🇿🇦 +27   South Africa',             min: 9,  max: 9  },
  { code: '+234',  label: '🇳🇬 +234  Nigeria',                  min: 10, max: 11 },
  { code: '+254',  label: '🇰🇪 +254  Kenya',                    min: 9,  max: 10 },
  { code: '+233',  label: '🇬🇭 +233  Ghana',                    min: 9,  max: 9  },
  { code: '+255',  label: '🇹🇿 +255  Tanzania',                 min: 9,  max: 9  },
  { code: '+256',  label: '🇺🇬 +256  Uganda',                   min: 9,  max: 9  },
  { code: '+251',  label: '🇪🇹 +251  Ethiopia',                 min: 9,  max: 9  },
  { code: '+212',  label: '🇲🇦 +212  Morocco',                  min: 9,  max: 9  },
  { code: '+216',  label: '🇹🇳 +216  Tunisia',                  min: 8,  max: 8  },
  { code: '+213',  label: '🇩🇿 +213  Algeria',                  min: 9,  max: 9  },
  { code: '+92',   label: '🇵🇰 +92   Pakistan',                 min: 10, max: 10 },
  { code: '+880',  label: '🇧🇩 +880  Bangladesh',               min: 10, max: 10 },
  { code: '+94',   label: '🇱🇰 +94   Sri Lanka',                min: 9,  max: 9  },
  { code: '+977',  label: '🇳🇵 +977  Nepal',                    min: 10, max: 10 },
  { code: '+95',   label: '🇲🇲 +95   Myanmar',                  min: 8,  max: 10 },
  { code: '+66',   label: '🇹🇭 +66   Thailand',                 min: 9,  max: 9  },
  { code: '+60',   label: '🇲🇾 +60   Malaysia',                 min: 9,  max: 10 },
  { code: '+62',   label: '🇮🇩 +62   Indonesia',                min: 10, max: 12 },
  { code: '+63',   label: '🇵🇭 +63   Philippines',              min: 10, max: 10 },
  { code: '+84',   label: '🇻🇳 +84   Vietnam',                  min: 9,  max: 10 },
  { code: '+855',  label: '🇰🇭 +855  Cambodia',                 min: 8,  max: 9  },
  { code: '+856',  label: '🇱🇦 +856  Laos',                     min: 8,  max: 10 },
  { code: '+82',   label: '🇰🇷 +82   South Korea',              min: 10, max: 11 },
  { code: '+886',  label: '🇹🇼 +886  Taiwan',                   min: 9,  max: 10 },
  { code: '+852',  label: '🇭🇰 +852  Hong Kong',                min: 8,  max: 8  },
  { code: '+853',  label: '🇲🇴 +853  Macau',                    min: 8,  max: 8  },
  { code: '+64',   label: '🇳🇿 +64   New Zealand',              min: 9,  max: 10 },
  { code: '+679',  label: '🇫🇯 +679  Fiji',                     min: 7,  max: 7  },
  { code: '+675',  label: '🇵🇬 +675  Papua New Guinea',         min: 8,  max: 8  },
  { code: '+54',   label: '🇦🇷 +54   Argentina',                min: 10, max: 10 },
  { code: '+56',   label: '🇨🇱 +56   Chile',                    min: 9,  max: 9  },
  { code: '+57',   label: '🇨🇴 +57   Colombia',                 min: 10, max: 10 },
  { code: '+58',   label: '🇻🇪 +58   Venezuela',                min: 10, max: 10 },
  { code: '+51',   label: '🇵🇪 +51   Peru',                     min: 9,  max: 9  },
  { code: '+593',  label: '🇪🇨 +593  Ecuador',                  min: 9,  max: 9  },
  { code: '+591',  label: '🇧🇴 +591  Bolivia',                  min: 8,  max: 8  },
  { code: '+595',  label: '🇵🇾 +595  Paraguay',                 min: 9,  max: 9  },
  { code: '+598',  label: '🇺🇾 +598  Uruguay',                  min: 8,  max: 8  },
  { code: '+506',  label: '🇨🇷 +506  Costa Rica',               min: 8,  max: 8  },
  { code: '+507',  label: '🇵🇦 +507  Panama',                   min: 7,  max: 8  },
  { code: '+502',  label: '🇬🇹 +502  Guatemala',                min: 8,  max: 8  },
  { code: '+503',  label: '🇸🇻 +503  El Salvador',              min: 8,  max: 8  },
  { code: '+504',  label: '🇭🇳 +504  Honduras',                 min: 8,  max: 8  },
  { code: '+505',  label: '🇳🇮 +505  Nicaragua',                min: 8,  max: 8  },
  { code: '+53',   label: '🇨🇺 +53   Cuba',                     min: 8,  max: 8  },
  { code: '+1-876',label: '🇯🇲 +1876 Jamaica',                  min: 10, max: 10 },
  { code: '+1-868',label: '🇹🇹 +1868 Trinidad & Tobago',        min: 10, max: 10 },
  { code: '+354',  label: '🇮🇸 +354  Iceland',                  min: 7,  max: 7  },
  { code: '+352',  label: '🇱🇺 +352  Luxembourg',               min: 8,  max: 9  },
  { code: '+356',  label: '🇲🇹 +356  Malta',                    min: 8,  max: 8  },
  { code: '+357',  label: '🇨🇾 +357  Cyprus',                   min: 8,  max: 8  },
  { code: '+370',  label: '🇱🇹 +370  Lithuania',                min: 8,  max: 8  },
  { code: '+371',  label: '🇱🇻 +371  Latvia',                   min: 8,  max: 8  },
  { code: '+372',  label: '🇪🇪 +372  Estonia',                  min: 7,  max: 8  },
  { code: '+421',  label: '🇸🇰 +421  Slovakia',                 min: 9,  max: 9  },
  { code: '+386',  label: '🇸🇮 +386  Slovenia',                 min: 8,  max: 8  },
  { code: '+385',  label: '🇭🇷 +385  Croatia',                  min: 8,  max: 9  },
  { code: '+381',  label: '🇷🇸 +381  Serbia',                   min: 8,  max: 9  },
  { code: '+387',  label: '🇧🇦 +387  Bosnia',                   min: 8,  max: 8  },
  { code: '+355',  label: '🇦🇱 +355  Albania',                  min: 8,  max: 9  },
  { code: '+389',  label: '🇲🇰 +389  North Macedonia',          min: 8,  max: 8  },
  { code: '+382',  label: '🇲🇪 +382  Montenegro',               min: 8,  max: 8  },
  { code: '+383',  label: '🇽🇰 +383  Kosovo',                   min: 8,  max: 8  },
  { code: '+359',  label: '🇧🇬 +359  Bulgaria',                 min: 8,  max: 9  },
  { code: '+373',  label: '🇲🇩 +373  Moldova',                  min: 8,  max: 8  },
  { code: '+374',  label: '🇦🇲 +374  Armenia',                  min: 8,  max: 8  },
  { code: '+995',  label: '🇬🇪 +995  Georgia',                  min: 9,  max: 9  },
  { code: '+994',  label: '🇦🇿 +994  Azerbaijan',               min: 9,  max: 9  },
  { code: '+998',  label: '🇺🇿 +998  Uzbekistan',               min: 9,  max: 9  },
  { code: '+996',  label: '🇰🇬 +996  Kyrgyzstan',               min: 9,  max: 9  },
  { code: '+992',  label: '🇹🇯 +992  Tajikistan',               min: 9,  max: 9  },
  { code: '+993',  label: '🇹🇲 +993  Turkmenistan',             min: 8,  max: 8  },
  { code: '+375',  label: '🇧🇾 +375  Belarus',                  min: 9,  max: 10 },
  { code: '+98',   label: '🇮🇷 +98   Iran',                     min: 10, max: 10 },
  { code: '+964',  label: '🇮🇶 +964  Iraq',                     min: 10, max: 10 },
  { code: '+963',  label: '🇸🇾 +963  Syria',                    min: 9,  max: 9  },
  { code: '+967',  label: '🇾🇪 +967  Yemen',                    min: 9,  max: 9  },
  { code: '+93',   label: '🇦🇫 +93   Afghanistan',              min: 9,  max: 9  },
  { code: '+960',  label: '🇲🇻 +960  Maldives',                 min: 7,  max: 7  },
  { code: '+975',  label: '🇧🇹 +975  Bhutan',                   min: 8,  max: 8  },
  { code: '+976',  label: '🇲🇳 +976  Mongolia',                 min: 8,  max: 8  },
  { code: '+673',  label: '🇧🇳 +673  Brunei',                   min: 7,  max: 7  },
  { code: '+670',  label: '🇹🇱 +670  Timor-Leste',              min: 7,  max: 8  },
  { code: '+237',  label: '🇨🇲 +237  Cameroon',                 min: 8,  max: 9  },
  { code: '+225',  label: '🇨🇮 +225  Ivory Coast',              min: 10, max: 10 },
  { code: '+221',  label: '🇸🇳 +221  Senegal',                  min: 9,  max: 9  },
  { code: '+243',  label: '🇨🇩 +243  DR Congo',                 min: 9,  max: 9  },
  { code: '+242',  label: '🇨🇬 +242  Congo',                    min: 9,  max: 9  },
  { code: '+250',  label: '🇷🇼 +250  Rwanda',                   min: 9,  max: 9  },
  { code: '+244',  label: '🇦🇴 +244  Angola',                   min: 9,  max: 9  },
  { code: '+258',  label: '🇲🇿 +258  Mozambique',               min: 9,  max: 9  },
  { code: '+260',  label: '🇿🇲 +260  Zambia',                   min: 9,  max: 9  },
  { code: '+263',  label: '🇿🇼 +263  Zimbabwe',                 min: 9,  max: 9  },
  { code: '+267',  label: '🇧🇼 +267  Botswana',                 min: 7,  max: 8  },
  { code: '+264',  label: '🇳🇦 +264  Namibia',                  min: 9,  max: 10 },
  { code: '+230',  label: '🇲🇺 +230  Mauritius',                min: 7,  max: 8  },
  { code: '+261',  label: '🇲🇬 +261  Madagascar',               min: 9,  max: 10 },
  { code: '+252',  label: '🇸🇴 +252  Somalia',                  min: 7,  max: 8  },
  { code: '+249',  label: '🇸🇩 +249  Sudan',                    min: 9,  max: 9  },
  { code: '+218',  label: '🇱🇾 +218  Libya',                    min: 9,  max: 10 },
  { code: '+228',  label: '🇹🇬 +228  Togo',                     min: 8,  max: 8  },
  { code: '+229',  label: '🇧🇯 +229  Benin',                    min: 8,  max: 8  },
  { code: '+226',  label: '🇧🇫 +226  Burkina Faso',             min: 8,  max: 8  },
  { code: '+223',  label: '🇲🇱 +223  Mali',                     min: 8,  max: 8  },
  { code: '+227',  label: '🇳🇪 +227  Niger',                    min: 8,  max: 8  },
  { code: '+235',  label: '🇹🇩 +235  Chad',                     min: 8,  max: 8  },
  { code: '+222',  label: '🇲🇷 +222  Mauritania',               min: 8,  max: 8  },
  { code: '+220',  label: '🇬🇲 +220  Gambia',                   min: 7,  max: 7  },
  { code: '+232',  label: '🇸🇱 +232  Sierra Leone',             min: 8,  max: 8  },
  { code: '+231',  label: '🇱🇷 +231  Liberia',                  min: 7,  max: 8  },
  { code: '+224',  label: '🇬🇳 +224  Guinea',                   min: 8,  max: 9  },
  { code: '+245',  label: '🇬🇼 +245  Guinea-Bissau',            min: 7,  max: 7  },
  { code: '+238',  label: '🇨🇻 +238  Cape Verde',               min: 7,  max: 7  },
  { code: '+239',  label: '🇸🇹 +239  Sao Tome',                 min: 7,  max: 7  },
  { code: '+240',  label: '🇬🇶 +240  Equatorial Guinea',        min: 9,  max: 9  },
  { code: '+241',  label: '🇬🇦 +241  Gabon',                    min: 7,  max: 8  },
  { code: '+236',  label: '🇨🇫 +236  Central African Rep.',     min: 8,  max: 8  },
  { code: '+257',  label: '🇧🇮 +257  Burundi',                  min: 8,  max: 8  },
  { code: '+291',  label: '🇪🇷 +291  Eritrea',                  min: 7,  max: 7  },
  { code: '+253',  label: '🇩🇯 +253  Djibouti',                 min: 8,  max: 8  },
  { code: '+269',  label: '🇰🇲 +269  Comoros',                  min: 7,  max: 7  },
  { code: '+248',  label: '🇸🇨 +248  Seychelles',               min: 7,  max: 7  },
  { code: '+266',  label: '🇱🇸 +266  Lesotho',                  min: 8,  max: 8  },
  { code: '+268',  label: '🇸🇿 +268  Eswatini',                 min: 8,  max: 8  },
  { code: '+265',  label: '🇲🇼 +265  Malawi',                   min: 9,  max: 9  },
  { code: '+262',  label: '🇷🇪 +262  Reunion',                  min: 9,  max: 9  },
  { code: '+500',  label: '🇫🇰 +500  Falkland Islands',         min: 5,  max: 5  },
  { code: '+590',  label: '🇬🇵 +590  Guadeloupe',               min: 9,  max: 9  },
  { code: '+594',  label: '🇬🇫 +594  French Guiana',            min: 9,  max: 9  },
  { code: '+596',  label: '🇲🇶 +596  Martinique',               min: 9,  max: 9  },
  { code: '+597',  label: '🇸🇷 +597  Suriname',                 min: 6,  max: 7  },
  { code: '+592',  label: '🇬🇾 +592  Guyana',                   min: 7,  max: 7  },
];

/** Lookup helper — returns { min, max } for the selected country code. */
const getCountryByCode = (code) =>
  COUNTRY_CODES.find(c => c.code === code) || { min: 7, max: 15 };

const DOCUMENT_CONFIGS = [
  { key: 'mca',     type: 'MCA',     title: 'MCA / Company Registration',     required: true  },
  { key: 'pan',     type: 'PAN',     title: 'Company PAN Card',               required: true  },
  { key: 'aadhaar', type: 'AADHAAR', title: 'Aadhaar (Proprietor/Director)',  required: true  },
  { key: 'gst',     type: 'GST',     title: 'GST Certificate',                required: true  },
  { key: 'msme',    type: 'MSME',    title: 'MSME Certificate',               required: true  },
  { key: 'award',   type: 'AWARD',   title: 'Awards & Recognitions',          required: false },
  { key: 'proof',   type: 'PROOF',   title: 'Other Supporting Proof',         required: false },
];

const FILE_ACCEPT       = '.pdf,.jpg,.jpeg,.png';
const FILE_ACCEPTED_EXT = ['pdf', 'jpg', 'jpeg', 'png'];
const FILE_MAX_MB       = 5;
const IMG_ACCEPT        = '.jpg,.jpeg,.png,.webp';
const IMG_ACCEPTED_EXT  = ['jpg', 'jpeg', 'png', 'webp'];

const ABOUT_MIN = 20;
const ABOUT_MAX = 500;

/* ════════════════════════════════════════════════════════════════════════════
 *  VALIDATORS
 * ════════════════════════════════════════════════════════════════════════════ */

const PATTERNS = {
  email:        /^[a-zA-Z0-9._%+-]+@[a-zA-Z][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/,
  phone10:      /^\d{10}$/,
  pincode6:     /^\d{6}$/,
  alphaSpace:   /^[a-zA-Z][a-zA-Z ]*[a-zA-Z]$|^[a-zA-Z]$/,
  cityName:     /^[a-zA-Z][a-zA-Z .\-]*[a-zA-Z]$|^[a-zA-Z]$/,
  urlStrict:    /^https?:\/\/[^\s]+\.[^\s]+$/i,
  upper:        /[A-Z]/,
  lower:        /[a-z]/,
  digit:        /\d/,
  special:      /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]~`';]/,
  allSameDigit: /^(\d)\1+$/,
  year:         /^(18|19|20)\d{2}$/,
};

const hasSequentialChars = (str, minLen = 4) => {
  if (!str || str.length < minLen) return false;
  const s = str.toLowerCase();
  for (let i = 0; i <= s.length - minLen; i++) {
    let asc = true, desc = true;
    for (let j = 1; j < minLen; j++) {
      const diff = s.charCodeAt(i + j) - s.charCodeAt(i + j - 1);
      if (diff !== 1)  asc  = false;
      if (diff !== -1) desc = false;
      if (!asc && !desc) break;
    }
    if (asc || desc) return true;
  }
  return false;
};
const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
const hasKeyboardSequence = (str, minLen = 4) => {
  if (!str || str.length < minLen) return false;
  const s = str.toLowerCase();
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i <= row.length - minLen; i++) {
      const seq = row.slice(i, i + minLen);
      if (s.includes(seq) || s.includes([...seq].reverse().join(''))) return true;
    }
  }
  return false;
};
const hasRepeatedChars = (str, minLen = 3) =>
  str && str.length >= minLen && new RegExp(`(.)\\1{${minLen - 1},}`).test(str);

const V = {
  fullName: (v) => {
    if (!v || !v.trim()) return 'Full name is required';
    const t = v.trim();
    if (t.length < 2 || t.length > 100) return 'Must be 2–100 characters';
    if (!PATTERNS.alphaSpace.test(t)) return 'Only alphabets and single spaces allowed';
    return '';
  },
  designation: (v) => {
    if (!v || !v.trim()) return 'Designation is required';
    if (v.trim().length < 2 || v.trim().length > 100) return 'Must be 2–100 characters';
    return '';
  },
  department: (v) => !v ? 'Department is required' : '',
  phone: (v, countryCode = '+91') => {
    if (!v) return 'Phone is required';
    const d = String(v).replace(/\D/g, '');
    const cc = getCountryByCode(countryCode);
    if (cc.min === cc.max) {
      if (d.length !== cc.min) return `Must be exactly ${cc.min} digits`;
    } else {
      if (d.length < cc.min || d.length > cc.max) return `Must be ${cc.min}–${cc.max} digits`;
    }
    if (PATTERNS.allSameDigit.test(d)) return 'Cannot be all same digits';
    if (countryCode === '+91' && !/^[6-9]/.test(d)) return 'Indian mobile must start with 6, 7, 8, or 9';
    return '';
  },
  email: (v, label = 'Email') => {
    if (!v || !v.trim()) return `${label} is required`;
    if (v.trim().length > 150) return 'Email too long';
    if (!PATTERNS.email.test(v.trim())) return 'Invalid email format';
    return '';
  },
  optionalEmail: (v) => !v ? '' : V.email(v),
  industryType: (v) => !v ? 'Industry type is required' : '',
  about: (v) => {
    if (!v || !v.trim()) return 'About company is required';
    if (v.trim().length < ABOUT_MIN) return `Minimum ${ABOUT_MIN} characters`;
    if (v.length > ABOUT_MAX) return `Maximum ${ABOUT_MAX} characters`;
    return '';
  },
  employeeRange: (v) => !v ? 'Employee count is required' : '',
  establishedYear: (v) => {
    if (!v) return '';
    if (!PATTERNS.year.test(String(v).trim())) return 'Invalid year (e.g. 2005)';
    const y = parseInt(v, 10);
    const current = new Date().getFullYear();
    if (y < 1800 || y > current) return `Must be between 1800 and ${current}`;
    return '';
  },
  addressLine1: (v) => {
    if (!v || !v.trim()) return 'Address is required';
    if (v.trim().length < 5 || v.trim().length > 255) return 'Must be 5–255 characters';
    return '';
  },
  city: (v) => {
    if (!v || !v.trim()) return 'City is required';
    if (!PATTERNS.cityName.test(v.trim())) return 'Only letters, spaces, - allowed';
    return '';
  },
  state: (v) => {
    if (!v || !v.trim()) return 'State is required';
    if (v.trim().length < 2) return 'Minimum 2 characters';
    return '';
  },
  pincode: (v) => {
    if (!v) return 'Pincode is required';
    if (!PATTERNS.pincode6.test(String(v).replace(/\D/g, ''))) return 'Must be exactly 6 digits';
    return '';
  },
  country: (v) => (!v || !v.trim()) ? 'Country is required' : '',
  locations: (v) => {
    if (!v || !v.trim()) return '';
    const parts = v.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.some(p => !PATTERNS.cityName.test(p))) return 'Only letters, spaces, - allowed';
    if (new Set(parts.map(p => p.toLowerCase())).size !== parts.length) return 'Duplicate locations';
    return '';
  },
  url: (v, { domain = null, domainLabel = null } = {}) => {
    if (!v || !v.trim()) return '';
    if (!PATTERNS.urlStrict.test(v.trim())) return 'Must start with http:// or https://';
    try { new URL(v.trim()); } catch { return 'Invalid URL format'; }
    if (domain && !new RegExp(domain, 'i').test(v.trim()))
      return `Must be a ${domainLabel || domain} URL`;
    return '';
  },
  file: (file, { maxMB = FILE_MAX_MB, accepted = FILE_ACCEPTED_EXT } = {}) => {
    if (!file) return '';
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxMB) return `File exceeds ${maxMB}MB (yours: ${sizeMB.toFixed(1)}MB)`;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!accepted.includes(ext)) return `Allowed: ${accepted.join(', ').toUpperCase()}`;
    return '';
  },
  password: (v) => {
    if (!v) return 'Password is required';
    if (v.length < 8 || v.length > 128) return 'Must be 8–128 characters';
    if (!PATTERNS.upper.test(v))   return 'Must contain an uppercase letter';
    if (!PATTERNS.lower.test(v))   return 'Must contain a lowercase letter';
    if (!PATTERNS.digit.test(v))   return 'Must contain a number';
    if (!PATTERNS.special.test(v)) return 'Must contain a special character';
    if (hasSequentialChars(v, 4))  return 'Cannot contain sequences';
    if (hasKeyboardSequence(v, 4)) return 'Cannot contain keyboard patterns';
    if (hasRepeatedChars(v, 3))    return 'Cannot contain 3+ repeated characters';
    return '';
  },
};

/* ════════════════════════════════════════════════════════════════════════════
 *  STYLE TOKENS
 * ════════════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════════════
 *  BRAND PALETTE — pine / sage / cream (canonical IEVALX tokens)
 * ════════════════════════════════════════════════════════════════════════════ */
const NAVY        = '#022124';
const NAVY_DARK   = '#011418';
const BLUE_ACCENT = '#5E815D';
const SUCCESS     = '#3E6E3E';
const ERROR_RED   = '#B4462F';
const WARNING     = '#A35A2D';
const MUTED       = '#7A7E76';
const BORDER      = '#E7EAE3';
const BG_SOFT     = '#F6F8F3';

const FONT  = "'Jost','DM Sans',sans-serif";
const SERIF = "'DM Serif Display','Jost',serif";

const B = {
  sage: '#7F9E7E', sageText: '#5E815D', sageDeep: '#4E6E4D',
  sageSoft: '#EDF3EC', sageWash: '#F3F7F1',
  faint: '#7A7E76', ink: '#101210',
  amberSoft: '#F6ECDF', errorSoft: '#FBECEA',
  doneSoft: '#EAF2E9',
};

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px', bgcolor: '#fff', fontFamily: FONT,
    fontSize: { xs: 13, sm: 14 },
    '& fieldset': { borderColor: BORDER, borderWidth: 1.5 },
    '&:hover fieldset': { borderColor: B.sage },
    '&.Mui-focused': { bgcolor: '#fff' },
    '&.Mui-focused fieldset': { borderColor: B.sageText, borderWidth: 2 },
  },
  '& .MuiInputBase-input': { color: B.ink, fontFamily: FONT },
  '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: B.faint, color: B.faint },
  '& .MuiInputLabel-root': { fontSize: { xs: 13, sm: 14 }, color: B.faint, fontFamily: FONT },
  '& .MuiInputLabel-root.Mui-focused': { color: B.sageText },
};

const primaryBtnSx = {
  height: { xs: 40, sm: 44 },
  px: { xs: 2.5, sm: 3 },
  bgcolor: B.sageText, color: '#fff', fontFamily: FONT,
  borderRadius: '12px',
  fontSize: { xs: 13, sm: 14 },
  fontWeight: 600, textTransform: 'none',
  boxShadow: '0 6px 16px rgba(94,129,93,0.35)', whiteSpace: 'nowrap',
  '&:hover': { bgcolor: B.sageDeep, boxShadow: '0 8px 20px rgba(78,110,77,.4)' },
  '&:disabled': { opacity: 0.55, bgcolor: B.sageText, color: '#fff' },
};

const secondaryBtnSx = {
  height: { xs: 40, sm: 44 },
  px: { xs: 2, sm: 2.5 },
  bgcolor: '#fff', color: NAVY, fontFamily: FONT,
  border: `1.5px solid ${BORDER}`,
  borderRadius: '12px',
  fontSize: { xs: 13, sm: 14 },
  fontWeight: 600, textTransform: 'none', whiteSpace: 'nowrap',
  '&:hover': { borderColor: B.sage, bgcolor: B.sageWash },
};

const dangerBtnSx = {
  height: { xs: 38, sm: 40 },
  px: { xs: 1.75, sm: 2.25 },
  bgcolor: '#fff', color: ERROR_RED, fontFamily: FONT,
  border: `1.5px solid ${ERROR_RED}`,
  borderRadius: '12px',
  fontSize: { xs: 12.5, sm: 13.5 },
  fontWeight: 600, textTransform: 'none', whiteSpace: 'nowrap',
  '&:hover': { bgcolor: B.errorSoft, borderColor: ERROR_RED },
};

const sectionHeaderSx = {
  fontSize: 11, fontFamily: FONT,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: B.faint,
  mt: { xs: 2.5, sm: 3 },
  mb: { xs: 1.5, sm: 1.75 },
  display: 'flex', alignItems: 'center', gap: 1.25,
  '&::after': { content: '""', flex: 1, height: '1px', bgcolor: BORDER },
};
/* ════════════════════════════════════════════════════════════════════════════
 *  PINCODE AUTO-FILL
 * ════════════════════════════════════════════════════════════════════════════ */
const fetchPincodeDetails = async (pincode) => {
  if (!pincode || pincode.length !== 6) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return {
        city: po.District || '',
        state: po.State || '',
        country: po.Country || 'India',
      };
    }
    return null;
  } catch {
    return null;
  }
};
/* ════════════════════════════════════════════════════════════════════════════
 *  FORM HELPERS
 *
 *  The main component owns ONE form object holding every field from every
 *  section.  These helpers build it from the loaded data and diff it back
 *  into per-section payloads at save time.
 * ════════════════════════════════════════════════════════════════════════════ */

/** Build a fully-populated form object from the loaded profile data. */
const buildInitialForm = (data) => {
  const a = data?.account  || {};
  const c = data?.company  || {};
  const p = data?.profile  || {};
  return {
    // account
    full_name:        a.full_name        || '',
    department:       a.department       || '',
    designation:      a.designation      || '',
    location_region:  a.location_region  || '',
    profile_image_file:    null,
    profile_image_preview: a.profile_image_url || null,
    // contact (these live on company, not profile)
    country_code:     c.country_code     || '+91',
    phone:            c.phone            || '',
    // company info
    industry_type:          c.industry_type          || '',
    about:                  p.about                  || '',
    employee_count_range:   p.employee_count_range   || '',
    established_year:       p.established_year       || '',
    locations:              p.locations              || '',
    company_logo_file:      null,
    company_logo_preview:   p.company_logo_url || null,
    // address + contact
    address_line1:     p.address_line1     || '',
    address_line2:     p.address_line2     || '',
    city:              p.city              || '',
    state:             p.state             || '',
    pincode:           p.pincode           || '',
    country:           p.country           || 'India',
    office_email:      p.office_email      || '',
    secondary_email:   p.secondary_email   || '',
    primary_contact:   p.primary_contact   || '',
    secondary_contact: p.secondary_contact || '',
    // social
    website_url:   p.website_url   || '',
    linkedin_url:  p.linkedin_url  || '',
    twitter_url:   p.twitter_url   || '',
    facebook_url:  p.facebook_url  || '',
    instagram_url: p.instagram_url || '',
    // security (passwords never come pre-filled)
    current_password: '',
    new_password:     '',
    confirm_password: '',
  };
};

/**
 * Which fields map to which save function.
 * Used both for diff-detection and for payload slicing at save time.
 */
const SECTION_FIELD_MAP = {
  account: ['full_name', 'department', 'designation', 'location_region',
            'country_code', 'phone', 'profile_image_file'],
  company: ['industry_type', 'about', 'employee_count_range',
            'established_year', 'locations', 'company_logo_file'],
  address: ['address_line1', 'address_line2', 'city', 'state', 'pincode',
            'country', 'office_email', 'secondary_email',
            'primary_contact', 'secondary_contact'],
  social:  ['website_url', 'linkedin_url', 'twitter_url',
            'facebook_url', 'instagram_url'],
  password: ['current_password', 'new_password'],
};

/**
 * Returns an object { account: payload|null, company: payload|null, … }
 * Only includes sections whose fields actually differ from `initial`.
 * Password section is special: only includes it if current_password is non-empty.
 */
const diffSections = (form, initial) => {
  const out = { account: null, company: null, address: null, social: null, password: null };

  for (const [section, fields] of Object.entries(SECTION_FIELD_MAP)) {
    if (section === 'password') {
      // passwords only save when user explicitly typed into them
      if (form.current_password || form.new_password) {
        out.password = {
          current_password: form.current_password,
          new_password:     form.new_password,
        };
      }
      continue;
    }
    const changed = fields.some(f => {
      const a = form[f];
      const b = initial[f];
      // File objects always count as "changed" if present
      if (a instanceof File) return true;
      return (a ?? '') !== (b ?? '');
    });
    if (changed) {
      const payload = {};
      fields.forEach(f => {
        const v = form[f];
        if (v instanceof File || (v !== null && v !== undefined && v !== '')) {
          payload[f] = typeof v === 'string' ? v.trim() : v;
        }
      });
      out[section] = payload;
    }
  }
  return out;
};

/* ════════════════════════════════════════════════════════════════════════════
 *  REUSABLE UI BITS
 * ════════════════════════════════════════════════════════════════════════════ */

/** View-mode field: label stacked above value. */
const FieldValue = ({ label, value, full = false, locked = false }) => (
    <Box sx={{
      gridColumn: full ? '1 / -1' : 'auto',
      cursor: 'default',
      borderRadius: '10px', px: 1.25, py: 1, mx: -1.25,
      transition: 'background-color .15s ease',
      '&:hover': { bgcolor: B.sageWash },
    }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <Typography sx={{
          fontSize: 10.5, color: B.faint, textTransform: 'uppercase',
          letterSpacing: '0.08em', fontWeight: 600, fontFamily: FONT,
        }}>
          {label}
        </Typography>
        {locked && (
          <Lock sx={{ fontSize: 11, color: B.faint }} />
        )}
      </Stack>
      {value && String(value).trim() ? (
        <Typography sx={{
          fontSize: { xs: 13, sm: 13.5 }, color: B.ink, fontFamily: FONT,
          wordBreak: 'break-word', lineHeight: 1.5,
        }}>
          {value}
        </Typography>
      ) : (
        <Typography sx={{
          fontSize: { xs: 13, sm: 13.5 }, color: B.faint, fontStyle: 'italic', fontFamily: FONT,
        }}>
          — not provided —
        </Typography>
      )}
    </Box>
);

/** Header-only card (no Edit button — Edit is global now). */
const SectionCard = ({ icon, title, subtitle, children, footer = null }) => (
  <Paper
    elevation={0}
    sx={{
      borderRadius: { xs: '12px', sm: '14px' },
      border: `1.5px solid ${BORDER}`,
      bgcolor: '#fff',
      overflow: 'hidden',
    }}
  >
    <Stack
      direction="row" alignItems="center"
      spacing={{ xs: 1, sm: 1.5 }}
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        borderBottom: `1px solid ${BORDER}`,
        bgcolor: BG_SOFT,
      }}
    >
      <Box sx={{
        width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 },
        borderRadius: '10px',
        bgcolor: B.sageSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {React.cloneElement(icon, { sx: { fontSize: { xs: 17, sm: 19 }, color: NAVY } })}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: { xs: 14, sm: 15, md: 16 }, fontWeight: 700, color: NAVY,
          lineHeight: 1.3,
        }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{
            fontSize: { xs: 11.5, sm: 12 }, color: B.faint,
            mt: 0.25, display: { xs: 'none', sm: 'block' },
          }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
    <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>{children}</Box>
    {footer && (
      <Box sx={{
        px: { xs: 2, sm: 2.5, md: 3 },
        py: { xs: 1.75, sm: 2 },
        borderTop: `1px solid ${BORDER}`,
        bgcolor: BG_SOFT,
      }}>
        {footer}
      </Box>
    )}
  </Paper>
);

/** Responsive 1/2/3-column grid for form fields. */
const FieldGrid = ({ children, columns = 2 }) => (
  <Box sx={{
    display: 'grid',
    gridTemplateColumns: {
      xs: '1fr',
      sm: columns === 3 ? '1fr 1fr' : '1fr 1fr',
      md: columns === 3 ? '1fr 1fr 1fr' : '1fr 1fr',
    },
    gap: { xs: 1.5, sm: 1.75 },
    mb: 1,
  }}>
    {children}
  </Box>
);

/** Chip-based multi-value input. */
const TagInput = ({ value, onChange, placeholder, hasError, disabled }) => {
  const [input, setInput] = useState('');
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
  const addTag = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) onChange([...tags, trimmed].join(', '));
    setInput('');
  };
  const removeTag = (tag) => onChange(tags.filter(t => t !== tag).join(', '));
  return (
    <Box sx={{
      display: 'flex', flexWrap: 'wrap', gap: 0.75,
      p: '8px 10px', minHeight: 44,
      cursor: disabled ? 'default' : 'text',
      border: '1.5px solid',
      borderColor: hasError ? ERROR_RED : '#e2e8f0',
      borderRadius: '10px',
      bgcolor: disabled ? '#f5f7fa' : hasError ? '#fff8f8' : BG_SOFT,
      opacity: disabled ? 0.8 : 1,
      '&:focus-within': disabled ? {} : {
        borderColor: NAVY, bgcolor: '#fff',
        boxShadow: '0 0 0 3px rgba(28,51,102,.08)',
      },
    }}>
      {tags.map(tag => (
        <Chip
          key={tag} label={tag} size="small"
          onDelete={disabled ? undefined : () => removeTag(tag)}
          deleteIcon={<Close />}
          sx={{
            bgcolor: B.sageSoft, color: NAVY,
            fontSize: 12, fontWeight: 500, height: 24,
            '& .MuiChip-deleteIcon': { color: '#6889C0', fontSize: 14, '&:hover': { color: ERROR_RED } },
          }}
        />
      ))}
      {!disabled && (
        <Box component="input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(input); }
            if (e.key === 'Backspace' && !input && tags.length) removeTag(tags[tags.length - 1]);
          }}
          onBlur={() => addTag(input)}
          placeholder={tags.length === 0 ? placeholder : ''}
          sx={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 14, color: '#1a202c', minWidth: 120, flex: 1,
          }}
        />
      )}
    </Box>
  );
};

/** Password strength meter. */
const StrengthBar = ({ password }) => {
  const score = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)  s++;
    if (password.length >= 12) s++;
    if (PATTERNS.upper.test(password) && PATTERNS.lower.test(password)) s++;
    if (PATTERNS.digit.test(password))   s++;
    if (PATTERNS.special.test(password)) s++;
    if (hasSequentialChars(password) || hasRepeatedChars(password) || hasKeyboardSequence(password))
      s = Math.max(0, s - 2);
    return Math.min(5, s);
  }, [password]);
  const colors = ['', ERROR_RED, WARNING, '#79AFEC', B.sageText, SUCCESS];
  const labels = ['', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  if (!password) return null;
  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" spacing={0.5}>
        {[1, 2, 3, 4, 5].map(i => (
          <Box key={i} sx={{
            flex: 1, height: 3, borderRadius: 99,
            bgcolor: i <= score ? colors[score] : BORDER,
            transition: 'background 0.3s',
          }} />
        ))}
      </Stack>
      <Typography sx={{ fontSize: 11, color: colors[score], mt: 0.5 }}>{labels[score]}</Typography>
    </Box>
  );
};
/** In-page image lightbox. Closes on backdrop click, ESC, or close button. */
const ImagePreviewDialog = ({ open, src, title, onClose }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="md"
    fullWidth
    PaperProps={{
      sx: {
        bgcolor: '#0b1220',
        borderRadius: '14px',
        overflow: 'hidden',
        m: { xs: 2, sm: 4 },
      },
    }}
  >
    <Box sx={{ position: 'relative' }}>
      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          bgcolor: 'rgba(255,255,255,0.12)', color: '#fff',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
        }}
      >
        <Close sx={{ fontSize: 18 }} />
      </IconButton>
      {title && (
        <Typography sx={{
          position: 'absolute', top: 14, left: 18, zIndex: 2,
          color: '#fff', fontSize: 13, fontWeight: 600, opacity: 0.9,
        }}>
          {title}
        </Typography>
      )}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: { xs: 280, sm: 420 },
        p: { xs: 4, sm: 5 },
      }}>
        {src ? (
          <Box component="img" src={src} alt={title || 'preview'}
            sx={{
              maxWidth: '100%', maxHeight: '70vh',
              objectFit: 'contain', borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,.4)',
            }}
          />
        ) : (
          <Typography sx={{ color: B.faint }}>No image available</Typography>
        )}
      </Box>
    </Box>
  </Dialog>
);

const AccountSection = ({ mode, form, errors, touched, onChange, onTouch, company, actionFooter }) => {
  const fileRef = useRef();
  const [previewOpen, setPreviewOpen] = useState(false);
  const showErr = (f) => touched[f] && !!errors[f];

  return (
    <SectionCard
      icon={<Person />}
      title="Account Details"
      subtitle="Your personal information as the company admin"
      footer={actionFooter}
    >
      {mode === 'view' ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2.5, sm: 3 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Box
            onClick={() => form.profile_image_preview && setPreviewOpen(true)}
            sx={{
              width: { xs: 64, sm: 80 }, height: { xs: 64, sm: 80 },
              borderRadius: '50%',
              bgcolor: NAVY,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0,
              color: '#fff',
              fontSize: { xs: 22, sm: 28 }, fontWeight: 700,
              cursor: form.profile_image_preview ? 'pointer' : 'default',
              transition: 'transform .15s',
              '&:hover': form.profile_image_preview ? { transform: 'scale(1.03)' } : {},
            }}
          >
            {form.profile_image_preview ? (
              <Box
                component="img"
                src={form.profile_image_preview}
                alt="profile"
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (form.full_name || 'U').charAt(0).toUpperCase()
            )}
          </Box>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: { xs: 1.75, sm: '14px 24px' },
            flex: 1, width: '100%',
          }}>
            <FieldValue label="Full Name" value={form.full_name} />
            <FieldValue label="Email" value={company?.email} locked />
            <FieldValue label="Department" value={form.department} />
            <FieldValue label="Designation" value={form.designation} />
            <FieldValue
              label="Contact Number"
              value={form.phone ? `${form.country_code || ''} ${form.phone}` : ''}
            />
            <FieldValue label="Location / Region" value={form.location_region} />
          </Box>
        </Stack>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
            <Avatar
              src={form.profile_image_preview || undefined}
              sx={{ width: 72, height: 72, bgcolor: NAVY, fontSize: 26, fontWeight: 700 }}
            >
              {(form.full_name || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Button component="label"
                startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
                sx={secondaryBtnSx}
              >
                Change Photo
                <input ref={fileRef} type="file" accept={IMG_ACCEPT} hidden
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const err = V.file(file, { maxMB: FILE_MAX_MB, accepted: IMG_ACCEPTED_EXT });
                    if (err) return;
                    onChange('profile_image_file', file);
                    onChange('profile_image_preview', URL.createObjectURL(file));
                  }}
                />
              </Button>
              <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.75 }}>
                JPG, PNG or WEBP · max {FILE_MAX_MB}MB
              </Typography>
            </Box>
          </Stack>

          <FieldGrid>
            <TextField size="small" label="Full Name *"
              value={form.full_name}
              onChange={e => onChange('full_name', e.target.value.replace(/[^a-zA-Z ]/g, ''))}
              onBlur={() => onTouch('full_name')}
              error={showErr('full_name')}
              helperText={showErr('full_name') ? errors.full_name : ' '}
              inputProps={{ maxLength: 100 }}
              sx={inputSx}
            />
            <TextField size="small" label="Email"
              value={company?.email || ''} disabled
              helperText=" "
              InputProps={{ endAdornment: <InputAdornment position="end"><Lock sx={{ fontSize: 15, color: MUTED }} /></InputAdornment> }}
              sx={inputSx}
            />
            <FormControl size="small" error={showErr('department')} sx={inputSx}>
              <InputLabel>Department *</InputLabel>
              <Select label="Department *"
                value={form.department}
                onChange={e => onChange('department', e.target.value)}
                onBlur={() => onTouch('department')}
              >
                {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
              <FormHelperText>{showErr('department') ? errors.department : ' '}</FormHelperText>
            </FormControl>
            <TextField size="small" label="Designation *"
              value={form.designation}
              onChange={e => onChange('designation', e.target.value)}
              onBlur={() => onTouch('designation')}
              error={showErr('designation')}
              helperText={showErr('designation') ? errors.designation : ' '}
              inputProps={{ maxLength: 100 }}
              sx={inputSx}
            />
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#4a5568', mb: 0.75 }}>
                Contact Number *
              </Typography>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '140px 1fr', sm: '200px 1fr' },
                gap: 1.25,
              }}>
                <Autocomplete
                  size="small"
                  disableClearable
                  value={COUNTRY_CODES.find(c => c.code === form.country_code) || COUNTRY_CODES[0]}
                  onChange={(_, newVal) => {
                    if (!newVal) return;
                    onChange('country_code', newVal.code);
                    const cc = getCountryByCode(newVal.code);
                    if (form.phone && form.phone.length > cc.max) {
                      onChange('phone', form.phone.slice(0, cc.max));
                    }
                  }}
                  options={COUNTRY_CODES}
                  getOptionLabel={(opt) => opt.label}
                  isOptionEqualToValue={(opt, val) => opt.code === val.code}
                  renderInput={(params) => <TextField {...params} />}
                  slotProps={{
                    paper: {
                      sx: { maxHeight: 300, fontSize: 13 },
                    },
                  }}
                  sx={inputSx}
                />
                <TextField size="small"
                  placeholder={(() => {
                    const cc = getCountryByCode(form.country_code);
                    return cc.min === cc.max
                      ? `${cc.min}-digit number`
                      : `${cc.min}–${cc.max} digit number`;
                  })()}
                  value={form.phone}
                  onChange={e => {
  const cc = getCountryByCode(form.country_code);
  onChange('phone', e.target.value.replace(/\D/g, '').slice(0, cc.max));
  onTouch('phone');
}}
                  onBlur={() => onTouch('phone')}
                  error={showErr('phone')}
                  inputProps={{ inputMode: 'numeric', maxLength: getCountryByCode(form.country_code).max }}
                  sx={inputSx}
                />
              </Box>
              {showErr('phone') && (
                <Typography sx={{ fontSize: 11.5, color: ERROR_RED, mt: 0.5 }}>⚠ {errors.phone}</Typography>
              )}
            </Box>
            <TextField size="small" label="Location / Region"
              placeholder="e.g. Hyderabad"
              value={form.location_region}
              onChange={e => onChange('location_region', e.target.value)}
              sx={inputSx}
            />
          </FieldGrid>
        </>
      )}
      <ImagePreviewDialog
        open={previewOpen}
        src={form.profile_image_preview}
        title="Profile photo"
        onClose={() => setPreviewOpen(false)}
      />
    </SectionCard>
  );
};

const CompanyInfoSection = ({ mode, form, errors, touched, onChange, onTouch, company, actionFooter }) => {
  const logoRef = useRef();
  const [previewOpen, setPreviewOpen] = useState(false);
  const showErr = (f) => touched[f] && !!errors[f];
  const charCounterColor =
    form.about.length >= ABOUT_MAX ? ERROR_RED
    : form.about.length > ABOUT_MAX - 50 ? WARNING
    : MUTED;

  return (
    <SectionCard
      icon={<Business />}
      title="Company Information"
      subtitle="Core details about your company"
      footer={actionFooter}
    >
      {mode === 'view' ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2.5, sm: 3 }}>
          <Box
            onClick={() => form.company_logo_preview && setPreviewOpen(true)}
            sx={{
              width: { xs: 72, sm: 96 }, height: { xs: 72, sm: 96 },
              borderRadius: '12px',
              border: `1.5px solid ${BORDER}`,
              bgcolor: BG_SOFT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'hidden',
              cursor: form.company_logo_preview ? 'pointer' : 'default',
              transition: 'transform .15s',
              '&:hover': form.company_logo_preview ? { transform: 'scale(1.03)' } : {},
            }}
          >
            {form.company_logo_preview ? (
              <Box component="img" src={form.company_logo_preview} alt="logo"
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Business sx={{ fontSize: { xs: 28, sm: 36 }, color: MUTED }} />
            )}
          </Box>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: { xs: 1.75, sm: '14px 24px' },
            flex: 1, width: '100%',
          }}>
            <FieldValue label="Company Name" value={company?.company_name} locked />
            <FieldValue label="Domain" value={company?.company_domain} locked />
            <FieldValue label="Industry" value={form.industry_type} />
            <FieldValue label="Employee Count" value={form.employee_count_range ? `${form.employee_count_range} employees` : ''} />
            <FieldValue label="Established Year" value={form.established_year} />
            <FieldValue label="Office Locations" value={form.locations} />
            <FieldValue label="About Company" value={form.about} full />
          </Box>
        </Stack>
      ) : (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
            <Box sx={{
              width: 80, height: 80,
              borderRadius: '12px',
              border: `2px dashed ${BORDER}`,
              bgcolor: BG_SOFT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {form.company_logo_preview ? (
                <Box component="img" src={form.company_logo_preview} alt="logo preview"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Business sx={{ fontSize: 30, color: MUTED }} />
              )}
            </Box>
            <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Button component="label"
                startIcon={<CloudUpload sx={{ fontSize: 16 }} />}
                sx={secondaryBtnSx}
              >
                Change Logo
                <input ref={logoRef} type="file" accept={IMG_ACCEPT} hidden
                  onChange={e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const err = V.file(file, { maxMB: FILE_MAX_MB, accepted: IMG_ACCEPTED_EXT });
                    if (err) return;
                    onChange('company_logo_file', file);
                    onChange('company_logo_preview', URL.createObjectURL(file));
                  }}
                />
              </Button>
              <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.75 }}>
                JPG, PNG or WEBP · max {FILE_MAX_MB}MB
              </Typography>
            </Box>
          </Stack>

          <FieldGrid>
            <TextField size="small" label="Company Name"
              value={company?.company_name || ''} disabled
              helperText=" "
              InputProps={{ endAdornment: <InputAdornment position="end"><Lock sx={{ fontSize: 15, color: MUTED }} /></InputAdornment> }}
              sx={inputSx}
            />
            <TextField size="small" label="Domain"
              value={company?.company_domain || ''} disabled
              helperText=" "
              InputProps={{ endAdornment: <InputAdornment position="end"><Lock sx={{ fontSize: 15, color: MUTED }} /></InputAdornment> }}
              sx={inputSx}
            />
            <FormControl size="small" error={showErr('industry_type')} sx={inputSx}>
              <InputLabel>Industry Type *</InputLabel>
              <Select label="Industry Type *"
                value={form.industry_type}
                onChange={e => onChange('industry_type', e.target.value)}
                onBlur={() => onTouch('industry_type')}
              >
                {INDUSTRY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
              <FormHelperText>{showErr('industry_type') ? errors.industry_type : ' '}</FormHelperText>
            </FormControl>
            <FormControl size="small" error={showErr('employee_count_range')} sx={inputSx}>
              <InputLabel>Employee Count *</InputLabel>
              <Select label="Employee Count *"
                value={form.employee_count_range}
                onChange={e => onChange('employee_count_range', e.target.value)}
                onBlur={() => onTouch('employee_count_range')}
              >
                {EMPLOYEE_RANGES.map(r => <MenuItem key={r} value={r}>{r} employees</MenuItem>)}
              </Select>
              <FormHelperText>{showErr('employee_count_range') ? errors.employee_count_range : ' '}</FormHelperText>
            </FormControl>
            <TextField size="small" label="Established Year"
              placeholder="e.g. 2005"
              value={form.established_year}
              onChange={e => onChange('established_year', e.target.value.replace(/\D/g, '').slice(0, 4))}
              onBlur={() => onTouch('established_year')}
              error={showErr('established_year')}
              helperText={showErr('established_year') ? errors.established_year : ' '}
              inputProps={{ inputMode: 'numeric', maxLength: 4 }}
              sx={inputSx}
            />
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#4a5568', mb: 0.75 }}>
                Office Locations
              </Typography>
              <TagInput
                value={form.locations}
                onChange={v => onChange('locations', v)}
                placeholder="Type a city and press Enter…"
                hasError={!!errors.locations}
              />
              {errors.locations && (
                <Typography sx={{ fontSize: 11.5, color: ERROR_RED, mt: 0.5 }}>⚠ {errors.locations}</Typography>
              )}
            </Box>
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <TextField fullWidth multiline minRows={3} size="small"
                label="About Company *"
                placeholder={`Brief description (${ABOUT_MIN}–${ABOUT_MAX} chars)…`}
                value={form.about}
                onChange={e => {
                  if (e.target.value.length > ABOUT_MAX) return;
                  onChange('about', e.target.value);
                }}
                onBlur={() => onTouch('about')}
                error={showErr('about')}
                helperText={showErr('about') ? errors.about : ' '}
                sx={inputSx}
              />
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.25 }}>
                <Typography sx={{ fontSize: 11, color: charCounterColor,
                  fontWeight: charCounterColor === ERROR_RED ? 600 : 400 }}>
                  {form.about.length}/{ABOUT_MAX}
                </Typography>
              </Stack>
            </Box>
          </FieldGrid>
        </>
      )}
      <ImagePreviewDialog
        open={previewOpen}
        src={form.company_logo_preview}
        title="Company logo"
        onClose={() => setPreviewOpen(false)}
      />
    </SectionCard>
  );
};
const AddressContactSection = ({ mode, form, errors, touched, onChange, onTouch, actionFooter }) => {
  const showErr = (f) => touched[f] && !!errors[f];
  const fullAddress = [
    form.address_line1, form.address_line2,
    form.city, form.state, form.pincode, form.country,
  ].filter(Boolean).join(', ');

  return (
    <SectionCard
      icon={<LocationOn />}
      title="Address & Contact"
      subtitle="Registered address, office email, and contact numbers"
      footer={actionFooter}
    >
      {mode === 'view' ? (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: { xs: 1.75, sm: '14px 24px' },
        }}>
          <FieldValue label="Registered Address" value={fullAddress} full />
          <FieldValue label="Office Email" value={form.office_email} />
          <FieldValue label="Secondary Email" value={form.secondary_email} />
          <FieldValue label="Primary Contact" value={form.primary_contact} />
          <FieldValue label="Secondary Contact" value={form.secondary_contact} />
        </Box>
      ) : (
        <>
          <Typography sx={sectionHeaderSx}>Registered Address</Typography>
          <TextField fullWidth size="small" label="Address Line 1 *"
            value={form.address_line1}
            onChange={e => onChange('address_line1', e.target.value)}
            onBlur={() => onTouch('address_line1')}
            error={showErr('address_line1')}
            helperText={showErr('address_line1') ? errors.address_line1 : ' '}
            inputProps={{ maxLength: 255 }}
            sx={{ ...inputSx, mb: 1.25 }}
          />
          <TextField fullWidth size="small" label="Address Line 2"
            value={form.address_line2}
            onChange={e => onChange('address_line2', e.target.value)}
            inputProps={{ maxLength: 255 }}
            sx={{ ...inputSx, mb: 1.25 }}
          />
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
            gap: { xs: 1.5, sm: 1.75 },
            mb: 1.25,
          }}>
            <TextField size="small" label="City *"
              value={form.city}
              onChange={e => onChange('city', e.target.value.replace(/[^a-zA-Z .\-]/g, ''))}
              onBlur={() => onTouch('city')}
              error={showErr('city')}
              helperText={showErr('city') ? errors.city : ' '}
              inputProps={{ maxLength: 100 }} sx={inputSx}
            />
            <TextField size="small" label="State *"
              value={form.state}
              onChange={e => onChange('state', e.target.value.replace(/[^a-zA-Z .\-]/g, ''))}
              onBlur={() => onTouch('state')}
              error={showErr('state')}
              helperText={showErr('state') ? errors.state : ' '}
              inputProps={{ maxLength: 100 }} sx={inputSx}
            />
            <TextField size="small" label="Pincode *"
              value={form.pincode}
              onChange={async e => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                onChange('pincode', val);
                onTouch('pincode');
                if (val.length === 6) {
                  const details = await fetchPincodeDetails(val);
                  if (details) {
                    onChange('city', details.city);
                    onChange('state', details.state);
                    onChange('country', details.country);
                  }
                }
              }}
              onBlur={() => onTouch('pincode')}
              error={showErr('pincode')}
              helperText={showErr('pincode') ? errors.pincode : ' '}
              inputProps={{ inputMode: 'numeric', maxLength: 6 }} sx={inputSx}
            />
          </Box>
          <TextField fullWidth size="small" label="Country *"
            value={form.country}
            onChange={e => onChange('country', e.target.value)}
            onBlur={() => onTouch('country')}
            error={showErr('country')}
            helperText={showErr('country') ? errors.country : ' '}
            inputProps={{ maxLength: 100 }} sx={inputSx}
          />

          <Typography sx={sectionHeaderSx}>Contact Information</Typography>
          <FieldGrid>
            <TextField size="small" type="email" label="Office Email *"
              value={form.office_email}
              onChange={e => onChange('office_email', e.target.value)}
              onBlur={() => onTouch('office_email')}
              error={showErr('office_email')}
              helperText={showErr('office_email') ? errors.office_email : ' '}
              sx={inputSx}
            />
            <TextField size="small" type="email" label="Secondary Email"
              placeholder="hr@company.com (optional)"
              value={form.secondary_email}
              onChange={e => onChange('secondary_email', e.target.value)}
              onBlur={() => onTouch('secondary_email')}
              error={showErr('secondary_email')}
              helperText={showErr('secondary_email') ? errors.secondary_email : ' '}
              sx={inputSx}
            />
            <TextField size="small" label="Primary Contact *"
              value={form.primary_contact}
              onChange={e => onChange('primary_contact', e.target.value.replace(/\D/g, '').slice(0, 10))}
              onBlur={() => onTouch('primary_contact')}
              error={showErr('primary_contact')}
              helperText={showErr('primary_contact') ? errors.primary_contact : ' '}
              inputProps={{ inputMode: 'numeric', maxLength: 10 }}
              sx={inputSx}
            />
            <TextField size="small" label="Secondary Contact"
              placeholder="Optional"
              value={form.secondary_contact}
              onChange={e => onChange('secondary_contact', e.target.value.replace(/\D/g, '').slice(0, 10))}
              onBlur={() => onTouch('secondary_contact')}
              error={showErr('secondary_contact')}
              helperText={showErr('secondary_contact') ? errors.secondary_contact : ' '}
              inputProps={{ inputMode: 'numeric', maxLength: 10 }}
              sx={inputSx}
            />
          </FieldGrid>
        </>
      )}
    </SectionCard>
  );
};

const SocialLinksSection = ({ mode, form, errors, touched, onChange, onTouch, actionFooter }) => {
  const showErr = (f) => touched[f] && !!errors[f];

  const LinkRow = ({ label, value }) => (
    <Box>
      <Typography sx={{
        fontSize: 10.5, color: MUTED, textTransform: 'uppercase',
        letterSpacing: '0.05em', fontWeight: 500, mb: 0.5,
      }}>
        {label}
      </Typography>
      {value ? (
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography component="a" href={value} target="_blank" rel="noopener noreferrer"
            sx={{
              fontSize: { xs: 13, sm: 13.5 }, color: BLUE_ACCENT,
              textDecoration: 'none', wordBreak: 'break-all',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {value}
          </Typography>
          <OpenInNew sx={{ fontSize: 13, color: MUTED, flexShrink: 0 }} />
        </Stack>
      ) : (
        <Typography sx={{ fontSize: 13.5, color: MUTED, fontStyle: 'italic' }}>
          — not linked —
        </Typography>
      )}
    </Box>
  );

  return (
    <SectionCard
      icon={<Language />}
      title="Social & Web Presence"
      subtitle="Your company's official website and social profiles"
      footer={actionFooter}
    >
      {mode === 'view' ? (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: { xs: 1.75, sm: '14px 24px' },
        }}>
          <LinkRow label="Website"     value={form.website_url} />
          <LinkRow label="LinkedIn"    value={form.linkedin_url} />
          <LinkRow label="Twitter / X" value={form.twitter_url} />
          <LinkRow label="Facebook"    value={form.facebook_url} />
          <LinkRow label="Instagram"   value={form.instagram_url} />
        </Box>
      ) : (
        <>
          <TextField fullWidth size="small" label="Official Website"
            placeholder="https://yourcompany.com"
            value={form.website_url}
            onChange={e => { onChange('website_url', e.target.value); onTouch('website_url'); }}
            onBlur={() => onTouch('website_url')}
            error={showErr('website_url')}
            helperText={showErr('website_url') ? errors.website_url : ' '}
            sx={{ ...inputSx, mb: 1.25 }}
          />
          <FieldGrid>
            <TextField size="small" label="LinkedIn"
              placeholder="https://linkedin.com/company/…"
              value={form.linkedin_url}
              onChange={e => { onChange('linkedin_url', e.target.value); onTouch('linkedin_url'); }}
              onBlur={() => onTouch('linkedin_url')}
              error={showErr('linkedin_url')}
              helperText={showErr('linkedin_url') ? errors.linkedin_url : ' '}
              sx={inputSx}
            />
            <TextField size="small" label="Twitter / X"
              placeholder="https://twitter.com/…"
              value={form.twitter_url}
              onChange={e => { onChange('twitter_url', e.target.value); onTouch('twitter_url'); }}
              onBlur={() => onTouch('twitter_url')}
              error={showErr('twitter_url')}
              helperText={showErr('twitter_url') ? errors.twitter_url : ' '}
              sx={inputSx}
            />
            <TextField size="small" label="Facebook"
              placeholder="https://facebook.com/…"
              value={form.facebook_url}
              onChange={e => { onChange('facebook_url', e.target.value); onTouch('facebook_url'); }}
              onBlur={() => onTouch('facebook_url')}
              error={showErr('facebook_url')}
              helperText={showErr('facebook_url') ? errors.facebook_url : ' '}
              sx={inputSx}
            />
            <TextField size="small" label="Instagram"
              placeholder="https://instagram.com/…"
              value={form.instagram_url}
              onChange={e => { onChange('instagram_url', e.target.value); onTouch('instagram_url'); }}
              onBlur={() => onTouch('instagram_url')}
              error={showErr('instagram_url')}
              helperText={showErr('instagram_url') ? errors.instagram_url : ' '}
              sx={inputSx}
            />
          </FieldGrid>
        </>
      )}
    </SectionCard>
  );
};


const DOC_VERIFICATION_CONFIG = {
  VERIFIED:     { bg: '#e8f7f0', color: SUCCESS,   label: 'Verified',     Icon: Verified       },
  PENDING:      { bg: '#fef6e8', color: WARNING,   label: 'Under Review', Icon: HourglassEmpty },
  REJECTED:     { bg: '#fee8e8', color: ERROR_RED, label: 'Rejected',     Icon: Cancel         },
  NOT_UPLOADED: { bg: '#f0f4ff', color: MUTED,     label: 'Not uploaded', Icon: null           },
};

const VerificationBadge = ({ status }) => {
  const cfg = DOC_VERIFICATION_CONFIG[status] || DOC_VERIFICATION_CONFIG.PENDING;
  const { Icon } = cfg;
  return (
    <Chip
      label={cfg.label}
      size="small"
      icon={Icon ? <Icon sx={{ fontSize: '13px !important', color: `${cfg.color} !important` }} /> : undefined}
      sx={{
        height: 22, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
        bgcolor: cfg.bg, color: cfg.color,
        '& .MuiChip-icon': { ml: '6px' },
      }}
    />
  );
};

const DocumentCard = ({ config, existingDoc, verificationStatus, busy, editable, onUpload, onReplace, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const effectiveStatus = existingDoc ? (verificationStatus || 'PENDING') : 'NOT_UPLOADED';
  const isRejected = effectiveStatus === 'REJECTED';

  const handleFileSelect = (isReplace) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = V.file(file, { maxMB: FILE_MAX_MB, accepted: FILE_ACCEPTED_EXT });
    if (err) { setUploadError(err); return; }
    setUploadError('');
    if (isReplace) {
      onReplace({ title: existingDoc.title, file });
    } else {
      onUpload({ type: config.type, title: config.title, file });
    }
    e.target.value = '';
  };

  return (
    <Paper variant="outlined" sx={{
      p: { xs: 1.75, sm: 2 }, mb: 1.5,
      borderRadius: '12px',
      border: `1.5px solid`,
      borderColor: isRejected ? '#fca5a5' : BORDER,
      bgcolor: existingDoc ? (isRejected ? '#fff8f8' : '#fafdfb') : '#fff',
      opacity: busy ? 0.75 : 1,
      transition: 'opacity .2s',
    }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={{ xs: 1, sm: 1 }} sx={{ mb: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Typography sx={{ fontSize: { xs: 13, sm: 13.5 }, fontWeight: 600, color: NAVY }}>
            {config.title}
          </Typography>
          <Chip label={config.required ? 'Required' : 'Optional'} size="small" sx={{
            height: 20, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            bgcolor: config.required ? '#fff0f0' : '#f0f4ff',
            color: config.required ? ERROR_RED : BLUE_ACCENT,
          }} />
          <VerificationBadge status={effectiveStatus} />
        </Stack>
      </Stack>

      {isRejected && existingDoc?.rejection_reason && (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: '8px', fontSize: 12, py: 0.5 }}>
          <strong>Reason:</strong> {existingDoc.rejection_reason} — please re-upload a corrected document.
        </Alert>
      )}

      {existingDoc ? (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={{ xs: 1, sm: 1.25 }}
            sx={{ p: { xs: 1.25, sm: 1.5 }, bgcolor: '#f0f4ff', borderRadius: '8px' }}
          >
            <InsertDriveFile sx={{ fontSize: 20, color: BLUE_ACCENT, flexShrink: 0 }} />
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <Typography sx={{
                fontSize: { xs: 12.5, sm: 13 }, color: '#1a202c', fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {existingDoc.title}
              </Typography>
              <Typography sx={{ fontSize: 11, color: MUTED }}>
                {existingDoc.file_name} · {(existingDoc.size_bytes / 1024 / 1024).toFixed(2)} MB · uploaded {existingDoc.uploaded_at}
                {existingDoc.verified_by ? ` · Reviewed by ${existingDoc.verified_by}` : ''}
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.75} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              {existingDoc.file_url && (
                <Button
                  component="a"
                  href={existingDoc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  startIcon={<OpenInNew sx={{ fontSize: 14 }} />}
                  sx={{ ...secondaryBtnSx, height: 32, px: 1.25, fontSize: 11.5, flex: { xs: 1, sm: 'unset' } }}
                >
                  View
                </Button>
              )}

                            {editable && !(config.required && effectiveStatus === 'VERIFIED') && (
                <>
                  <Button component="label" size="small" disabled={busy}
                    startIcon={busy ? <CircularProgress size={12} /> : <CloudUpload sx={{ fontSize: 14 }} />}
                    sx={{ ...secondaryBtnSx, height: 32, px: 1.25, fontSize: 11.5, flex: { xs: 1, sm: 'unset' } }}
                  >
                    Replace
                    <input type="file" accept={FILE_ACCEPT} hidden onChange={handleFileSelect(true)} />
                  </Button>
                  <IconButton size="small" disabled={busy} onClick={() => setConfirmDelete(true)} sx={{
                    color: ERROR_RED, border: `1.5px solid ${ERROR_RED}`,
                    borderRadius: '8px', width: 32, height: 32,
                    '&:hover': { bgcolor: '#fff5f5' },
                  }}>
                    <Delete sx={{ fontSize: 15 }} />
                  </IconButton>
                </>
              )}
            </Stack>
          </Stack>
          {uploadError && (
            <Typography sx={{ fontSize: 11.5, color: ERROR_RED, mt: 1 }}>⚠ {uploadError}</Typography>
          )}
        </>
      ) : editable ? (
        <>
          <Paper variant="outlined" sx={{
            p: { xs: 1.5, sm: 2 }, textAlign: 'center',
            cursor: busy ? 'default' : 'pointer', position: 'relative',
            border: `2px dashed ${BORDER}`, bgcolor: BG_SOFT, borderRadius: '10px',
            transition: 'all .18s',
            '&:hover': busy ? {} : { borderColor: NAVY, bgcolor: B.sageWash },
          }}>
            <Box component="input" type="file" accept={FILE_ACCEPT} disabled={busy}
              onChange={handleFileSelect(false)}
              sx={{
                position: 'absolute', inset: 0, opacity: 0,
                cursor: busy ? 'default' : 'pointer', width: '100%', height: '100%',
              }}
            />
            {busy ? <CircularProgress size={20} /> : (
              <>
                <CloudUpload sx={{ fontSize: 22, color: NAVY, mb: 0.5 }} />
                <Typography sx={{ fontSize: { xs: 12, sm: 13 }, color: B.faint }}>
                  <Box component="span" sx={{ color: NAVY, fontWeight: 600 }}>Click to upload</Box>
                  {' '}— PDF, JPG or PNG (max {FILE_MAX_MB}MB)
                </Typography>
              </>
            )}
          </Paper>
          {uploadError && (
            <Typography sx={{ fontSize: 11.5, color: ERROR_RED, mt: 1 }}>⚠ {uploadError}</Typography>
          )}
        </>
      ) : (
        <Typography sx={{ fontSize: 12.5, color: MUTED, fontStyle: 'italic', py: 1 }}>
          No document uploaded. Click Edit above to add one.
        </Typography>
      )}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
          Delete this document?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: '#4a5568' }}>
            This will permanently remove <strong>{existingDoc?.title}</strong>.
            You can re-upload it later if needed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDelete(false)} sx={secondaryBtnSx}>Cancel</Button>
          <Button onClick={() => { setConfirmDelete(false); onDelete(); }} sx={dangerBtnSx}
            startIcon={<Delete sx={{ fontSize: 15 }} />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const VerificationProgressBanner = ({ allRequiredVerified, anyRejected, isActivated, requiredDocs, loading }) => {
  if (loading) return null;

  if (isActivated && allRequiredVerified) {
    return (
      <Alert severity="success" icon={<Verified sx={{ fontSize: 18 }} />}
        sx={{ mb: 2.5, borderRadius: '10px', fontSize: 13 }}>
        <strong>Account activated!</strong> All required documents have been verified.
        Your company account is fully active.
      </Alert>
    );
  }
  if (anyRejected) {
    const rejected = requiredDocs.filter(d => d.status === 'REJECTED').map(d => d.document_type);
    return (
      <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px', fontSize: 13 }}>
        <strong>Action needed:</strong> The following document(s) were rejected:{' '}
        <strong>{rejected.join(', ')}</strong>. Please re-upload corrected copies.
      </Alert>
    );
  }
  const notUploaded = requiredDocs.filter(d => d.status === 'NOT_UPLOADED').map(d => d.document_type);
  if (notUploaded.length > 0) {
    return (
      <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '10px', fontSize: 13 }}>
        <strong>Upload required:</strong> Missing: <strong>{notUploaded.join(', ')}</strong>.
        Upload all 5 required documents to begin verification.
      </Alert>
    );
  }
  const pending = requiredDocs.filter(d => d.status === 'PENDING');
  if (pending.length > 0) {
    return (
      <Alert severity="info" icon={<HourglassEmpty sx={{ fontSize: 18 }} />}
        sx={{ mb: 2.5, borderRadius: '10px', fontSize: 13 }}>
        <strong>Under review</strong> — your documents are being verified by our team.
        This usually takes 1–2 business days.
      </Alert>
    );
  }
  return null;
};

const DocumentsSection = ({ documents, companyId, companyProfileId, data, setData, mode, actionFooter }) => {
  const { busyDocKey, error, upload, replace, remove } = useDocuments(companyId, data, setData);

  const {
    isActivated, allRequiredVerified, anyRejected,
    requiredDocs, docStatusByType,
    loading: statusLoading, refetch: refetchStatus,
  } = useDocumentVerificationStatus(companyProfileId, { pollInterval: 30_000 });

  const wrappedUpload = async (key, args) => { await upload(key, args); refetchStatus(); };
  const wrappedReplace = async (key, docId, args) => { await replace(key, docId, args); refetchStatus(); };

  const docsByType = useMemo(() => {
    const map = {};
    (documents || []).forEach(d => { map[d.type] = d; });
    return map;
  }, [documents]);

  return (
    <SectionCard icon={<Description />} title="Documents"
      subtitle="Upload your company verification documents — status updates automatically"
      footer={actionFooter}
    >
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}

      <VerificationProgressBanner
        allRequiredVerified={allRequiredVerified}
        anyRejected={anyRejected}
        isActivated={isActivated}
        requiredDocs={requiredDocs}
        loading={statusLoading}
      />

      {mode === 'view' && !statusLoading && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '10px', fontSize: 12.5 }}>
          Click <strong>Edit</strong> above to upload, replace, or delete documents.
          Verification is handled by our admin team.
        </Alert>
      )}
      <Box>
        {DOCUMENT_CONFIGS.map(config => {
          const existingDoc = docsByType[config.type];
          const docKey = config.key;
          return (
            <DocumentCard key={docKey}
              config={config} existingDoc={existingDoc}
              verificationStatus={docStatusByType[config.type]}
              busy={busyDocKey === docKey}
              editable={mode === 'edit'}
              onUpload={(args)  => wrappedUpload(docKey, args)}
              onReplace={(args) => wrappedReplace(docKey, existingDoc.document_id, args)}
              onDelete={()      => remove(docKey, existingDoc.document_id)}
            />
          );
        })}
      </Box>
    </SectionCard>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
 *  SECURITY SECTION — passwords live in the global form too
 * ════════════════════════════════════════════════════════════════════════════ */

const SecuritySection = ({ mode, form, errors, touched, onChange, onTouch, actionFooter }) => {
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const showErr = (f) => touched[f] && !!errors[f];

  return (
    <SectionCard icon={<Shield />} title="Security"
      subtitle="Change your account password"
      footer={actionFooter}
    >
      {mode === 'view' ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <Box sx={{
            width: 48, height: 48, borderRadius: '50%',
            bgcolor: '#e8f7f0', color: SUCCESS,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <CheckCircle sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: NAVY }}>
              Your password is secure
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: MUTED, mt: 0.25 }}>
              Click Edit above to change your password.
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          <Alert severity="info" sx={{ borderRadius: '10px', fontSize: 12 }}>
            Leave these fields blank if you don't want to change your password.
            Otherwise, fill all three fields.
          </Alert>

          <TextField
            fullWidth size="small" label="Current Password"
            type={show.current ? 'text' : 'password'}
            value={form.current_password}
            onChange={e => onChange('current_password', e.target.value)}
            onBlur={() => onTouch('current_password')}
            error={showErr('current_password')}
            helperText={showErr('current_password') ? errors.current_password : ' '}
            slotProps={{
              htmlInput: { maxLength: 128 },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="toggle current password visibility"
                      onClick={() => setShow(s => ({ ...s, current: !s.current }))}
                      sx={{ color: MUTED, '&:hover': { color: NAVY } }}
                    >
                      {show.current ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={inputSx}
          />

          <Box>
            <TextField
              fullWidth size="small" label="New Password"
              type={show.next ? 'text' : 'password'}
              value={form.new_password}
              onChange={e => onChange('new_password', e.target.value)}
              onBlur={() => onTouch('new_password')}
              error={showErr('new_password')}
              helperText={showErr('new_password') ? errors.new_password : ' '}
                            slotProps={{
                htmlInput: { maxLength: 128 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        aria-label="toggle current password visibility"
                        onClick={() => setShow(s => ({ ...s, next: !s.next }))}
                        sx={{ color: MUTED, '&:hover': { color: NAVY } }}
                      >
                        {show.next ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              sx={inputSx}
            />
            {form.new_password && <StrengthBar password={form.new_password} />}
          </Box>

          <TextField
            fullWidth size="small" label="Confirm New Password"
            type={show.confirm ? 'text' : 'password'}
            value={form.confirm_password}
            onChange={e => onChange('confirm_password', e.target.value)}
            onBlur={() => onTouch('confirm_password')}
            error={showErr('confirm_password')}
            helperText={showErr('confirm_password') ? errors.confirm_password : ' '}
            slotProps={{
              htmlInput: { maxLength: 128 },
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
                      sx={{ color: MUTED, '&:hover': { color: NAVY } }}
                    >
                      {show.confirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={inputSx}
          />

          <Typography sx={{ fontSize: 11.5, color: MUTED }}>
            Password must be 8+ characters with uppercase, lowercase, number, and special character.
          </Typography>
        </Stack>
      )}
    </SectionCard>
  );
};
/* ════════════════════════════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ════════════════════════════════════════════════════════════════════════════ */

const TABS = [
  { key: 'account',   label: 'Account',       icon: <Person />,      shortLabel: 'Account'  },
  { key: 'company',   label: 'Company Info',  icon: <Business />,    shortLabel: 'Company'  },
  { key: 'address',   label: 'Address',       icon: <LocationOn />,  shortLabel: 'Address'  },
  { key: 'social',    label: 'Social Links',  icon: <Language />,    shortLabel: 'Social'   },
  { key: 'documents', label: 'Documents',     icon: <Description />, shortLabel: 'Docs'     },
  { key: 'security',  label: 'Security',      icon: <Shield />,      shortLabel: 'Security' },
];

/**
 * Computes validation errors for every field in the global form.
 * Only includes errors for fields that actually have content OR are required.
 */
const computeErrors = (form) => {
  const e = {};

  // Account
  const fn = V.fullName(form.full_name);            if (fn) e.full_name = fn;
  const dept = V.department(form.department);       if (dept) e.department = dept;
  const des = V.designation(form.designation);      if (des) e.designation = des;
  const ph = V.phone(form.phone, form.country_code);if (ph) e.phone = ph;

  // Company
  const ind = V.industryType(form.industry_type);          if (ind) e.industry_type = ind;
  const abt = V.about(form.about);                          if (abt) e.about = abt;
  const emp = V.employeeRange(form.employee_count_range);  if (emp) e.employee_count_range = emp;
  const yr  = V.establishedYear(form.established_year);    if (yr)  e.established_year = yr;
  const loc = V.locations(form.locations);                  if (loc) e.locations = loc;

  // Address
  const a1  = V.addressLine1(form.address_line1);  if (a1)  e.address_line1 = a1;
  const cty = V.city(form.city);                   if (cty) e.city = cty;
  const st  = V.state(form.state);                 if (st)  e.state = st;
  const pin = V.pincode(form.pincode);             if (pin) e.pincode = pin;
  const ctr = V.country(form.country);             if (ctr) e.country = ctr;
  const oe  = V.email(form.office_email, 'Office email'); if (oe) e.office_email = oe;
  const se  = V.optionalEmail(form.secondary_email);       if (se) e.secondary_email = se;
  const pc  = V.phone(form.primary_contact);               if (pc) e.primary_contact = pc;
  if (form.secondary_contact) {
    const sc = V.phone(form.secondary_contact);
    if (sc) e.secondary_contact = sc;
    else if (form.secondary_contact === form.primary_contact)
      e.secondary_contact = 'Must differ from primary contact';
  }

  // Social
  const w = V.url(form.website_url);                                                     if (w) e.website_url = w;
  const l = V.url(form.linkedin_url,  { domain: 'linkedin\\.com',           domainLabel: 'linkedin.com' });     if (l) e.linkedin_url = l;
  const t = V.url(form.twitter_url,   { domain: 'twitter\\.com|x\\.com',   domainLabel: 'twitter/x.com' });    if (t) e.twitter_url = t;
  const f = V.url(form.facebook_url,  { domain: 'facebook\\.com|fb\\.com', domainLabel: 'facebook.com' });     if (f) e.facebook_url = f;
  const i = V.url(form.instagram_url, { domain: 'instagram\\.com',         domainLabel: 'instagram.com' });    if (i) e.instagram_url = i;

  // Password — only validated if user started typing one
  if (form.current_password || form.new_password || form.confirm_password) {
    if (!form.current_password) e.current_password = 'Current password is required';
    const npe = V.password(form.new_password); if (npe) e.new_password = npe;
    if (form.current_password && form.new_password && form.current_password === form.new_password)
      e.new_password = 'New password must be different from current';
    if (!form.confirm_password) e.confirm_password = 'Please confirm new password';
    else if (form.new_password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
  }

  return e;
};
/** Company-only: keep the Topbar avatar cache in sync with the saved photo. */
const syncCompanyAvatarCache = (url) => {
  if (!url) return;
  localStorage.setItem('user_profile_image_url', url);
  localStorage.setItem('user_profile_image_url_ts', String(Date.now()));
  window.dispatchEvent(new CustomEvent('profile-image-updated', { detail: { url } }));
};

const CompanyProfile = () => {
  const theme = useTheme();
  const isVerySmall = useMediaQuery(theme.breakpoints.down('sm'));

  const { user, updateUser } = useAuth() || {};
const companyId =
  user?.id ??
  user?.Id ??
  user?.company_id ??
  user?.Company_Id ??
  user?.companyId ??
  user?.company?.id ??
  localStorage.getItem('currentCompanyId') ??
  null;

// Keep localStorage in sync so reloads work even if useAuth hydrates slowly
useEffect(() => {
  if (companyId) localStorage.setItem('currentCompanyId', String(companyId));
}, [companyId]);

  const {
  data, setData, loading, error,
  saving, saveError, saveSuccess, clearMessages,
  saveAccount, saveCompany, saveAddress, saveSocial, savePassword,
  refetch,
} = useCompanyProfile(companyId);

  const [mode, setMode]       = useState('view');   
  const [form, setForm]       = useState(null);      
  const [initial, setInitial] = useState(null);      
  const [touched, setTouched] = useState({});
  const [activeTab, setActiveTab] = useState('account');
  const [toast, setToast] = useState(null);

 useEffect(() => {
  if (data && !form) {
    const built = buildInitialForm(data);
    setForm(built);
    setInitial(built);
    syncCompanyAvatarCache(built.profile_image_preview);

    // Sync auth context so the header/sidebar show the real name + photo
    // immediately on page load, not just after a save.
    if (typeof updateUser === 'function') {
      const freshName  = data?.account?.full_name;
      const freshPhoto = data?.account?.profile_image_url;
      const needsSync =
        (freshName  && freshName  !== user?.full_name) ||
        (freshPhoto && freshPhoto !== user?.profile_image_url);

      if (needsSync) {
        updateUser({
          ...user,
          full_name:         freshName  || user?.full_name,
          profile_image_url: freshPhoto || user?.profile_image_url,
        });
      }
    }
  }
}, [data, form, user, updateUser]);

  // toast on save messages
  useEffect(() => {
    if (saveSuccess) {
      setToast({ kind: 'success', msg: 'Changes saved successfully' });
      const t = setTimeout(() => { clearMessages(); setToast(null); }, 3500);
      return () => clearTimeout(t);
    }
  }, [saveSuccess, clearMessages]);
  useEffect(() => {
    if (saveError) {
      setToast({ kind: 'error', msg: saveError });
      const t = setTimeout(() => { clearMessages(); setToast(null); }, 5000);
      return () => clearTimeout(t);
    }
  }, [saveError, clearMessages]);

  const errors = useMemo(() => form ? computeErrors(form) : {}, [form]);
  const formValid = Object.keys(errors).length === 0;
  const hasChanges = useMemo(() => {
    if (!form || !initial) return false;
    const diffs = diffSections(form, initial);
    return Object.values(diffs).some(p => p !== null);
  }, [form, initial]);

  const onChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const onTouch  = (field)        => setTouched(prev => ({ ...prev, [field]: true }));

  const enterEdit = () => { setTouched({}); setMode('edit'); };

  const cancelEdit = () => {
    // revert: reset form to initial snapshot
    setForm(initial);
    setTouched({});
    setMode('view');
  };
  const handleSave = async () => {
    // mark all error-holding fields as touched so errors show
    const next = { ...touched };
    Object.keys(errors).forEach(k => { next[k] = true; });
    setTouched(next);

    if (!formValid) {
      setToast({ kind: 'error', msg: 'Please fix the errors before saving' });
      return;
    }

    const diffs = diffSections(form, initial);
    const saveJobs = [];
    if (diffs.account)  saveJobs.push({ name: 'account',  fn: () => saveAccount(diffs.account)   });
    if (diffs.company)  saveJobs.push({ name: 'company',  fn: () => saveCompany(diffs.company)   });
    if (diffs.address)  saveJobs.push({ name: 'address',  fn: () => saveAddress(diffs.address)   });
    if (diffs.social)   saveJobs.push({ name: 'social',   fn: () => saveSocial(diffs.social)     });
    if (diffs.password) saveJobs.push({ name: 'password', fn: () => savePassword(diffs.password) });

    if (saveJobs.length === 0) {
      setMode('view');
      return;
    }

    try {
      for (const job of saveJobs) {
        await job.fn();
      }

      // Pull fresh data from the server so we rebuild `form` with real S3 URLs,
      const fresh = await refetch();

      if (fresh) {
        const rebuilt = buildInitialForm(fresh);
        setForm(rebuilt);
        setInitial(rebuilt);
        syncCompanyAvatarCache(rebuilt.profile_image_preview);

        // Sync the auth context with the REAL S3 URL, never a blob URL
        if (typeof updateUser === 'function') {
          updateUser({
            ...user,
            profile_image_url: fresh?.account?.profile_image_url || null,
            full_name:         fresh?.account?.full_name || user?.full_name,
          });
        }
      } else {
        // refetch failed — at minimum clear password fields locally
        setForm(prev => {
          const cleaned = { ...prev, current_password: '', new_password: '', confirm_password: '' };
          setInitial(cleaned);
          return cleaned;
        });
      }

      setTouched({});
      setMode('view');
      setToast({
        kind: 'success',
        msg: `Saved ${saveJobs.length} section${saveJobs.length > 1 ? 's' : ''} successfully`,
      });
    } catch {
      // runSave already set saveError state → toast shows via effect
    }
  };

  /* ── Loading / error boundaries ────────────────────────────── */
  // 1. Genuine loading spinner — only while the request is in flight
if (loading) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Paper sx={{ p: 6, borderRadius: '16px', border: `1.5px solid ${BORDER}`, bgcolor: '#fff', display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} sx={{ color: B.sageText }} />
      </Paper>
    </Box>
  );
}

// 2. Error state — now actually reachable
if (error || !data) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Alert severity="error" sx={{ borderRadius: '12px', fontFamily: FONT }}>
        <strong>Failed to load profile:</strong> {error || 'No data available'}
        {!companyId && (
          <Box sx={{ mt: 1, fontSize: 12 }}>
            No company ID was found in your session. Try logging out and back in,
            or re-running registration.
          </Box>
        )}
      </Alert>
    </Box>
  );
}

// 3. Brief gap while form is being built from data — shouldn't normally show
if (!form) return null;

  const { company, documents } = data;

  /* ── Action footer (Save/Cancel) rendered inside each section in edit mode ── */
  const actionFooter = mode === 'edit' ? (
    <Stack
      direction={{ xs: 'column-reverse', sm: 'row' }}
      justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
      alignItems="center"
      spacing={{ xs: 1.25, sm: 1.5 }}
    >
      {hasChanges && (
        <Typography sx={{
          fontSize: 12.5, color: WARNING, fontWeight: 600,
          mr: { sm: 'auto' },
          display: { xs: 'none', sm: 'block' },
        }}>
          ● You have unsaved changes
        </Typography>
      )}
      <Button
        onClick={cancelEdit}
        disabled={saving}
        startIcon={<CancelIcon sx={{ fontSize: 16 }} />}
        sx={{ ...secondaryBtnSx, width: { xs: '100%', sm: 'auto' } }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving || !hasChanges || !formValid}
        startIcon={saving
          ? <CircularProgress size={14} sx={{ color: '#fff' }} />
          : <Save sx={{ fontSize: 16 }} />
        }
        sx={{ ...primaryBtnSx, width: { xs: '100%', sm: 'auto' } }}
      >
        {saving ? 'Saving…' : 'Save Changes'}
      </Button>
    </Stack>
  ) : null;

  /* ── Render active tab ─────────────────────────────────────── */
  const renderTab = () => {
    const common = { mode, form, errors, touched, onChange, onTouch, actionFooter };
    switch (activeTab) {
      case 'account':   return <AccountSection         {...common} company={company} />;
      case 'company':   return <CompanyInfoSection     {...common} company={company} />;
      case 'address':   return <AddressContactSection  {...common} />;
      case 'social':    return <SocialLinksSection     {...common} />;
      case 'documents': return <DocumentsSection
        documents={documents} companyId={companyId}
        companyProfileId={companyId}
        data={data} setData={setData} mode={mode}
        actionFooter={actionFooter}
      />;
      case 'security':  return <SecuritySection        {...common} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto', pb: { xs: 4, md: 6 }, fontFamily: FONT }}>
      {/* Page header with global Edit button */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: { xs: 1.5, sm: 2 },
        mb: { xs: 2.5, sm: 3, md: 3.5 },
      }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{
            fontFamily: SERIF,
            fontSize: { xs: 22, sm: 26, md: 30 },
            fontWeight: 400, color: NAVY, lineHeight: 1.15,
          }}>
            Company Profile
          </Typography>
          <Typography sx={{
            fontFamily: FONT,
            fontSize: { xs: 12.5, sm: 13.5, md: 14 },
            color: B.faint, mt: 0.5,
          }}>
            {mode === 'view'
              ? 'Manage your company information, documents, and account settings'
              : 'Edit your information across any tab, then save all changes at once'}
          </Typography>
        </Box>
        {mode === 'view' && (
          <Button
            variant="contained"
            onClick={enterEdit}
            startIcon={<Edit sx={{ fontSize: 18 }} />}
            sx={{
              ...primaryBtnSx,
              width: { xs: '100%', sm: 'auto' },
              flexShrink: 0,
              alignSelf: { xs: 'stretch', sm: 'center' },
            }}
          >
            Edit Profile
          </Button>
        )}
      </Box>

      {/* Edit-mode banner */}
      {mode === 'edit' && (
        <Alert
          severity="info"
          icon={<Edit sx={{ fontSize: 18 }} />}
          sx={{
            mb: { xs: 2, sm: 2.5 },
            borderRadius: '12px',
            fontSize: 12.5, fontFamily: FONT,
            bgcolor: B.sageSoft,
            color: NAVY,
            border: `1px solid ${B.sage}22`,
            '& .MuiAlert-icon': { color: B.sageText },
          }}
        >
          <strong>Editing mode.</strong> Make changes across any tab, then click Save at the bottom.
          Only changed sections will be saved.
        </Alert>
      )}

      {/* Tabs */}
      <Paper elevation={0} sx={{
        mb: { xs: 2, sm: 2.5 },
        borderRadius: { xs: '12px', sm: '16px' },
        border: `1.5px solid ${BORDER}`,
        bgcolor: '#fff', overflow: 'hidden',
      }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: { xs: 44, sm: 52 },
            '& .MuiTabs-indicator': { bgcolor: B.sageText, height: 3, borderRadius: '3px 3px 0 0' },
            '& .MuiTab-root': {
              minHeight: { xs: 44, sm: 52 },
              minWidth: { xs: 72, sm: 110 },
              fontSize: { xs: 11.5, sm: 13 },
              fontWeight: 600, textTransform: 'none', fontFamily: FONT,
              color: B.faint,
              px: { xs: 1.5, sm: 2 },
              py: { xs: 1, sm: 1.25 },
              '&.Mui-selected': { color: NAVY },
              '& .MuiTab-iconWrapper': {
                mb: '0 !important',
                mr: { xs: 0, sm: 0.75 },
              },
            },
            '& .MuiTabs-flexContainer': { gap: { xs: 0, sm: 0.5 } },
          }}
        >
          {TABS.map(t => (
            <Tab
              key={t.key} value={t.key}
              icon={React.cloneElement(t.icon, { sx: { fontSize: { xs: 17, sm: 18 } } })}
              iconPosition={isVerySmall ? 'top' : 'start'}
              label={isVerySmall ? t.shortLabel : t.label}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Active tab content */}
      <Fade in key={activeTab} timeout={250}>
        <Box>{renderTab()}</Box>
      </Fade>

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={toast?.kind === 'error' ? 5000 : 3500}
        onClose={() => setToast(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: isVerySmall ? 'center' : 'right',
        }}
        sx={{ bottom: { xs: 24, sm: 24 } }}
      >
        {toast ? (
          <Alert
            severity={toast.kind}
            onClose={() => setToast(null)}
            sx={{
              borderRadius: '10px',
              boxShadow: '0 6px 20px rgba(0,0,0,.12)',
              fontSize: 13,
              minWidth: { xs: 280, sm: 320 },
            }}
          >
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default CompanyProfile;