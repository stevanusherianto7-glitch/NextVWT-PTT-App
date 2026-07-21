/**
 * Channel definitions — static channel list + Supabase fetch with fallback.
 */
import { getSupabase } from './supabase';

export interface ChannelConfigItem {
  number: number;
  name: string;
  type: 'green' | 'red' | 'gray' | 'violet';
  users: string[];
}

const BASE_CHANNELS: ChannelConfigItem[] = [
  { number: 0, name: 'DUKUNGAN & BANTUAN', type: 'green', users: [] },
  {
    number: 99,
    name: 'AI OPERATOR COMPANION',
    type: 'violet',
    users: ['AI Operator'],
  },
  {
    number: 100,
    name: 'LANDING-ECHO CHANNEL',
    type: 'violet',
    users: [
      'Pebri Haryanto',
      'antoni_99',
      'budi_salatiga',
      'rudi_bandung',
      'medan_dx',
      'palembang_line',
      'touring_rider',
      'ninja_club',
      'pak_rudi_rt',
      'siskamling_1',
      'lalin_update',
      'anto_bekasi',
      'doni_depok',
      'makassar_boy',
      'sar_team_1',
      'mount_hiker',
      'support_admin',
      'eko_pratama',
      'dewi_sari',
      'siti_aminah',
      'joko_susilo',
      'hendra_w',
      'yudi_antara',
      'agus_setiawan',
      'roni_h',
      'irma_p',
      'pebri_fans',
      'noc_global',
      'sys_admin_vwt',
      'pjc_room_manager',
      'operator_otomatis',
      'mario_teguh',
      'nina_marlina',
      'oscar_lawalata',
    ],
  },
  {
    number: 101,
    name: 'MOCK USERS / MODERATION TEST',
    type: 'green',
    users: [
      'agus_santika',
      'budi_santoso',
      'citra_kirana',
      'dedi_pratama',
      'euis_cahyani',
      'fajar_nugraha',
      'gilang_ramadhan',
      'hendra_gunawan',
      'indah_permatasari',
      'joko_susanto',
      'kiki_amalia',
    ],
  },
  {
    number: 1,
    name: 'KOPDAR NASIONAL UTAMA',
    type: 'green',
    users: [
      'antoni_99',
      'budi_salatiga',
      'rudi_bandung',
      'noc_global',
      'sys_admin_vwt',
      'pjc_room_manager',
      'mario_teguh',
      'agus_santika',
      'budi_santoso',
      'citra_kirana',
      'dedi_pratama',
      'euis_cahyani',
      'fajar_nugraha',
    ],
  },
  { number: 2, name: 'LINTAS SUMATERA DX', type: 'green', users: ['medan_dx', 'palembang_line'] },
  { number: 3, name: 'LINTAS JAWA DX LINE', type: 'green', users: [] },
  { number: 4, name: 'LINTAS BALI & NTT DX', type: 'green', users: [] },
  {
    number: 5,
    name: 'KOMUNITAS MOTOR INDO',
    type: 'green',
    users: ['touring_rider', 'ninja_club'],
  },
  {
    number: 6,
    name: 'PATROLI KEAMANAN WARGA',
    type: 'red',
    users: ['pak_rudi_rt', 'siskamling_1'],
  },
  { number: 7, name: 'INFO MUDIK & LALIN', type: 'red', users: ['lalin_update'] },
  { number: 8, name: 'CH-KEDALUWARSA', type: 'gray', users: [] },
  { number: 9, name: 'STANDBY CHANNEL 09', type: 'gray', users: [] },
  { number: 10, name: 'STANDBY CHANNEL 10', type: 'gray', users: [] },
  {
    number: 11,
    name: 'PAGUYUBAN JABODETABEK',
    type: 'green',
    users: ['anto_bekasi', 'doni_depok'],
  },
  { number: 12, name: 'DX SULAWESI & MALUKU', type: 'green', users: ['makassar_boy'] },
  { number: 13, name: 'RELAWAN KEMANUSIAAN', type: 'red', users: ['sar_team_1'] },
  { number: 14, name: 'STANDBY CHANNEL 14', type: 'gray', users: [] },
  { number: 15, name: 'STANDBY CHANNEL 15', type: 'gray', users: [] },
  { number: 16, name: 'STANDBY CHANNEL 16', type: 'gray', users: [] },
  { number: 17, name: 'STANDBY CHANNEL 17', type: 'gray', users: [] },
  { number: 18, name: 'STANDBY CHANNEL 18', type: 'gray', users: [] },
  { number: 19, name: 'STANDBY CHANNEL 19', type: 'gray', users: [] },
  { number: 20, name: 'PECINTA ALAM INDO', type: 'green', users: ['mount_hiker'] },
  { number: 21, name: 'STANDBY CHANNEL 21', type: 'gray', users: [] },
  { number: 22, name: 'STANDBY CHANNEL 22', type: 'gray', users: [] },
  { number: 23, name: 'STANDBY CHANNEL 23', type: 'gray', users: [] },
  { number: 24, name: 'STANDBY CHANNEL 24', type: 'gray', users: [] },
  { number: 25, name: 'STANDBY CHANNEL 25', type: 'gray', users: [] },
  { number: 26, name: 'STANDBY CHANNEL 26', type: 'gray', users: [] },
  { number: 27, name: 'STANDBY CHANNEL 27', type: 'gray', users: [] },
  { number: 28, name: 'STANDBY CHANNEL 28', type: 'gray', users: [] },
  { number: 29, name: 'STANDBY CHANNEL 29', type: 'gray', users: [] },
  { number: 30, name: 'BANTUAN TEKNIS ADMIN', type: 'red', users: ['support_admin'] },
];

/** Generate 300 channels (0-299) with static fallback data. */
export const CHANNELS: ChannelConfigItem[] = Array.from({ length: 300 })
  .map((_, i) => {
    const existing = BASE_CHANNELS.find((c) => c.number === i);
    if (existing) return existing;
    return {
      number: i,
      name: `STANDBY CHANNEL ${i.toString().padStart(3, '0')}`,
      type: 'gray',
      users: [],
    } as ChannelConfigItem;
  })
  .sort((a, b) => {
    const getSortOrder = (n: number) => (n === 100 ? 0.5 : n);
    return getSortOrder(a.number) - getSortOrder(b.number);
  });

interface DBChannelItem {
  number: number;
  name: string;
  type: string;
  is_restricted: boolean;
  info: string | null;
}

/** Fetch channels from Supabase with static fallback (TINGGI-03). */
export async function fetchChannels(): Promise<ChannelConfigItem[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('channels')
      .select('number, name, type, is_restricted, info')
      .order('number', { ascending: true });

    if (error || !data || data.length === 0) return CHANNELS;

    const dbData = data as unknown as DBChannelItem[];

    const mergedChannels = [...CHANNELS];
    dbData.forEach((ch) => {
      const idx = mergedChannels.findIndex((mc) => mc.number === ch.number);
      const mapped = {
        number: ch.number,
        name: ch.name,
        type: (ch.type === 'red' ||
        ch.type === 'green' ||
        ch.type === 'gray' ||
        ch.type === 'violet'
          ? ch.type
          : 'gray') as 'green' | 'red' | 'gray' | 'violet',
        users: [],
      };
      if (idx !== -1) {
        mergedChannels[idx] = mapped;
      } else {
        mergedChannels.push(mapped);
      }
    });

    mergedChannels.sort((a, b) => {
      const getSortOrder = (n: number) => (n === 100 ? 0.5 : n);
      return getSortOrder(a.number) - getSortOrder(b.number);
    });
    return mergedChannels;
  } catch (err) {
    console.warn(
      'Failed to fetch channels from Supabase, falling back to static configurations:',
      err
    );
    return CHANNELS;
  }
}
