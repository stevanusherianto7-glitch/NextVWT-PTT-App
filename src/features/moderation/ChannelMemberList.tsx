import { useState, useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { usePTTStore } from '../../app/store/usePTTStore';
import { getSupabase } from '../../app/utils/supabase';
import { useModerationActions } from './useModerationActions';
import {
  canModerateRole,
  canPerformAction,
  roleRank,
  getGlobalRole,
  type ChannelRole,
  type ChannelUserStatus,
} from './permissions';
import {
  MoreVertical,
  VolumeX,
  MicOff,
  MessageSquareOff,
  UserMinus,
  ShieldAlert,
  Search,
  UserX,
  X,
  Shield,
  UserPlus,
} from 'lucide-react';
import { USER_PROFILES } from '../../app/components/UserListModal';
import iconVoice from '../../assets/icon_voice.png';

interface MemberRoleStatus {
  user_id: string;
  role: ChannelRole;
  status: ChannelUserStatus;
}

interface BannedUser {
  user_id: string;
  reason?: string;
  banned_by: string;
  banned_at: string;
}

interface ChannelMemberListProps {
  roomId: string;
  actorRole: ChannelRole;
  actorId: string;
}

export function ChannelMemberList({ roomId, actorRole, actorId }: ChannelMemberListProps) {
  const activeUsers = usePTTStore((state) => state.activeUsers);
  const {
    setUserRole,
    muteUser,
    unmuteUser,
    blockPTT,
    unblockPTT,
    blockChat,
    unblockChat,
    kickUser,
    banUser,
    unbanUser,
  } = useModerationActions({ roomId, actorId, actorRole });

  // Local state for role and status mapping from database
  const [dbRoles, setDbRoles] = useState<Record<string, MemberRoleStatus>>({});
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'online' | 'banned'>('online');

  // Add Member states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    displayName: string;
    role: ChannelRole;
    status: ChannelUserStatus;
  } | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [muteMinutes, setMuteMinutes] = useState(15);
  const [blockMinutes, setBlockMinutes] = useState(15);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load database roles/statuses and banned users
  useEffect(() => {
    if (!roomId) return;

    let mounted = true;

    async function loadData() {
      try {
        const supabaseInstance = await getSupabase();

        // Load roles
        const { data: rolesData, error: rolesError } = await supabaseInstance
          .from('channel_roles')
          .select('user_id, role, status')
          .eq('room_id', roomId);

        if (rolesError) console.error('Error loading channel roles:', rolesError);

        // Load bans
        const { data: bansData, error: bansError } = await supabaseInstance
          .from('channel_bans')
          .select('user_id, reason, banned_by, banned_at')
          .eq('room_id', roomId);

        if (bansError) console.error('Error loading channel bans:', bansError);

        if (!mounted) return;

        if (rolesData) {
          const mapping: Record<string, MemberRoleStatus> = {};
          rolesData.forEach((r) => {
            mapping[r.user_id] = r as MemberRoleStatus;
          });
          setDbRoles(mapping);
        }

        if (bansData) {
          setBannedUsers(bansData as BannedUser[]);
        }
      } catch (err) {
        console.error('Failed to load moderation member data:', err);
      }
    }

    loadData();

    // Subscribe to changes in roles and bans
    let rolesChannel: RealtimeChannel | null = null;
    let bansChannel: RealtimeChannel | null = null;

    (async () => {
      const supabaseInstance = await getSupabase();

      rolesChannel = supabaseInstance
        .channel(`member-roles:${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'channel_roles', filter: `room_id=eq.${roomId}` },
          () => loadData()
        )
        .subscribe();

      bansChannel = supabaseInstance
        .channel(`member-bans:${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'channel_bans', filter: `room_id=eq.${roomId}` },
          () => loadData()
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      const cRoles = rolesChannel;
      const cBans = bansChannel;
      if (cRoles) getSupabase().then((sub) => sub.removeChannel(cRoles));
      if (cBans) getSupabase().then((sub) => sub.removeChannel(cBans));
    };
  }, [roomId]);

  // Auto-fill member name based on ID (callSign)
  useEffect(() => {
    if (newMemberId.length >= 2) {
      const foundProfile = Object.values(USER_PROFILES).find(
        (p) => p.callSign.toUpperCase() === newMemberId.toUpperCase()
      );
      if (foundProfile) {
        setNewMemberName(foundProfile.displayName);
      }
    }
  }, [newMemberId]);

  const handleAddMember = async () => {
    if (!newMemberId || !newMemberName) {
      setErrorMessage('ID User dan Nama harus diisi');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setIsAddingMember(true);
    const foundProfileId = Object.keys(USER_PROFILES).find(
      (k) => USER_PROFILES[k].callSign.toUpperCase() === newMemberId.toUpperCase()
    );
    const userIdToSave = foundProfileId || newMemberId.toUpperCase();

    try {
      await setUserRole(userIdToSave, 'guest', 'guest');
      setIsAddingMember(false);
      setSuccessMessage('Warga tetap berhasil ditambahkan');
      setNewMemberId('');
      setNewMemberName('');
      setShowAddForm(false);
      setDbRoles((prev) => ({
        ...prev,
        [userIdToSave]: {
          user_id: userIdToSave,
          role: 'guest',
          status: 'active',
        },
      }));
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: unknown) {
      setIsAddingMember(false);
      const err = error as Error;
      setErrorMessage(err.message || 'Gagal menambahkan warga');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleOpenActions = (userId: string, displayName: string) => {
    const userDbInfo = dbRoles[userId] || { role: 'guest', status: 'active' };
    setSelectedUser({
      userId,
      displayName,
      role: userDbInfo.role,
      status: userDbInfo.status,
    });
    setBanReason('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowActionModal(true);
  };

  const handleAction = async (actionFn: () => Promise<void>, successText: string) => {
    try {
      setErrorMessage('');
      setSuccessMessage('');
      await actionFn();
      setSuccessMessage(successText);
      setTimeout(() => {
        setShowActionModal(false);
        setSelectedUser(null);
      }, 1500);
    } catch (error: unknown) {
      const err = error as Error;
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses aksi.');
    }
  };

  const filteredOnlineUsers = activeUsers.filter((u) => {
    // NOC tidak termasuk dalam hirarki pengelolaan channel manapun
    const globalRole = getGlobalRole(u.userId, u.displayName, u.callSign);
    if (globalRole === 'noc') return false;

    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.callSign.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getRoleLabel = (role: ChannelRole) => {
    switch (role) {
      case 'noc':
        return 'N.O.C';
      case 'sys_admin':
        return 'Sys Admin';
      case 'pjc':
        return 'P.J.C';
      case 'operator':
        return 'Operator';
      case 'guest':
        return 'Tamu';
      default:
        return role;
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Sub tabs for Online vs Banned */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('online')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            activeTab === 'online'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Online ({filteredOnlineUsers.length})
        </button>
        {canPerformAction(actorRole, 'BAN_USER') && (
          <button
            type="button"
            onClick={() => setActiveTab('banned')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'banned'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Banned ({bannedUsers.length})
          </button>
        )}
      </div>

      {/* Actions & Search */}
      {activeTab === 'online' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Cari nama atau callsign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="moderation-input pl-9"
              />
            </div>
            {canPerformAction(actorRole, 'MANAGE_ROLES') && (
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className={`p-2 rounded-lg transition-colors ${
                  showAddForm
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title="Tambah Warga Tetap"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-2">
              <h4 className="text-sm font-semibold text-white mb-2">Tambah Warga Tetap</h4>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="ID User (5 karakter)..."
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value.toUpperCase())}
                  className="moderation-input"
                  maxLength={5}
                />
                <input
                  type="text"
                  placeholder="Nama User..."
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="moderation-input"
                />
                <button
                  onClick={handleAddMember}
                  disabled={isAddingMember || !newMemberId || !newMemberName}
                  className="w-full mt-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isAddingMember ? 'Menyimpan...' : 'Tambahkan'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lists */}
      <div className="flex-1 overflow-y-auto pr-1">
        {activeTab === 'online' ? (
          filteredOnlineUsers.length === 0 ? (
            <div className="text-center text-slate-500 py-8 text-sm">
              Tidak ada pengguna online yang cocok.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredOnlineUsers.map((u) => {
                const userDbInfo = dbRoles[u.userId] || { role: 'guest', status: 'active' };
                const isActorSelf = u.userId === actorId;
                const canModerate = !isActorSelf && canModerateRole(actorRole, userDbInfo.role);

                return (
                  <div
                    key={u.userId}
                    className="moderation-glass-card flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-emerald-400 text-sm">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.displayName}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <img
                            src={iconVoice}
                            alt={u.displayName}
                            className="h-full w-full rounded-full object-contain p-[3px] opacity-90"
                          />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{u.displayName}</span>
                          <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-400">
                            {u.callSign}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`role-badge ${userDbInfo.role}`}>
                            {getRoleLabel(userDbInfo.role)}
                          </span>
                          {userDbInfo.status !== 'active' && (
                            <span className={`status-badge ${userDbInfo.status}`}>
                              {userDbInfo.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {canModerate && (
                      <button
                        type="button"
                        onClick={() => handleOpenActions(u.userId, u.displayName)}
                        title="Tindakan Moderasi"
                        aria-label={`Tindakan moderasi untuk ${u.displayName}`}
                        className="p-1.5 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : bannedUsers.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            Tidak ada pengguna yang di-ban.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {bannedUsers.map((bu) => (
              <div
                key={bu.user_id}
                className="moderation-glass-card flex items-center justify-between p-3 border-red-500/20"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm text-red-300">{bu.user_id}</span>
                  {bu.reason && <span className="text-xs text-slate-400">Alasan: {bu.reason}</span>}
                  <span className="text-[10px] text-slate-500">
                    Banned oleh: {bu.banned_by} | {new Date(bu.banned_at).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => unbanUser(bu.user_id)}
                  className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-[11px] text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-all font-semibold"
                >
                  Unban
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Moderation Dialog (Popup Modal) */}
      {showActionModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="moderation-glass-card w-full max-w-md max-h-[90vh] overflow-y-auto border-emerald-500/20 shadow-emerald-950/20 flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Moderatir Menu</span>
                <span className="font-bold text-white text-base">{selectedUser.displayName}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedUser(null);
                }}
                title="Tutup menu moderasi"
                aria-label="Tutup menu moderasi"
                className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error / Success Messages */}
            {errorMessage && (
              <div className="p-2 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-2 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded">
                {successMessage}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* Role Assignment */}
              {canPerformAction(actorRole, 'MANAGE_ROLES') && (
                <div className="border border-white/5 rounded-lg p-2.5 bg-black/20 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" /> Atur Jabatan
                  </span>
                  <div className="flex gap-2 mt-1">
                    <select
                      title="Pilih Jabatan"
                      aria-label="Pilih Jabatan"
                      value={selectedUser.role}
                      onChange={(e) => {
                        const nextRole = e.target.value as ChannelRole;
                        handleAction(
                          () => setUserRole(selectedUser.userId, selectedUser.role, nextRole),
                          `Berhasil mengubah role menjadi ${getRoleLabel(nextRole)}.`
                        );
                      }}
                      className="moderation-select flex-1"
                    >
                      {roleRank[actorRole] > roleRank['operator'] && (
                        <option value="operator">Operator Otomatis</option>
                      )}
                      {roleRank[actorRole] > roleRank['pjc'] && (
                        <option value="pjc">PJC (Penanggung Jawab)</option>
                      )}
                      {roleRank[actorRole] > roleRank['sys_admin'] && (
                        <option value="sys_admin">Sys Admin</option>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* Status Actions */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                {/* Mute User */}
                {canPerformAction(actorRole, 'MUTE_USER') && (
                  <div className="border border-white/5 rounded-lg p-2.5 bg-black/20 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <VolumeX className="h-3.5 w-3.5" /> Mute Suara
                    </span>
                    {selectedUser.status === 'muted' ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleAction(
                            () => unmuteUser(selectedUser.userId, selectedUser.role),
                            'Mute dibatalkan.'
                          )
                        }
                        className="py-1 px-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded text-xs font-semibold"
                      >
                        Buka Mute
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <select
                          title="Durasi Mute"
                          aria-label="Durasi Mute"
                          value={muteMinutes}
                          onChange={(e) => setMuteMinutes(Number(e.target.value))}
                          className="moderation-select text-xs"
                        >
                          <option value={5}>5 Menit</option>
                          <option value={15}>15 Menit</option>
                          <option value={60}>1 Jam</option>
                          <option value={1440}>24 Jam</option>
                          <option value={0}>Permanen</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handleAction(
                              () => muteUser(selectedUser.userId, selectedUser.role, muteMinutes),
                              'User berhasil di-mute.'
                            )
                          }
                          className="py-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-all"
                        >
                          Mute
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* PTT Control */}
                {canPerformAction(actorRole, 'BLOCK_PTT') && (
                  <div className="border border-white/5 rounded-lg p-2.5 bg-black/20 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <MicOff className="h-3.5 w-3.5" /> Blokir PTT
                    </span>
                    {selectedUser.status === 'ptt_blocked' ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleAction(
                            () => unblockPTT(selectedUser.userId, selectedUser.role),
                            'Blokir PTT dibatalkan.'
                          )
                        }
                        className="py-1 px-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded text-xs font-semibold"
                      >
                        Buka PTT
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <select
                          title="Durasi Blokir PTT"
                          aria-label="Durasi Blokir PTT"
                          value={blockMinutes}
                          onChange={(e) => setBlockMinutes(Number(e.target.value))}
                          className="moderation-select text-xs"
                        >
                          <option value={5}>5 Menit</option>
                          <option value={15}>15 Menit</option>
                          <option value={60}>1 Jam</option>
                          <option value={1440}>24 Jam</option>
                          <option value={0}>Permanen</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handleAction(
                              () => blockPTT(selectedUser.userId, selectedUser.role, blockMinutes),
                              'PTT berhasil diblokir.'
                            )
                          }
                          className="py-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-all"
                        >
                          Blokir PTT
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Chat Control */}
                {canPerformAction(actorRole, 'BLOCK_CHAT') && (
                  <div className="border border-white/5 rounded-lg p-2.5 bg-black/20 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <MessageSquareOff className="h-3.5 w-3.5" /> Blokir Chat
                    </span>
                    {selectedUser.status === 'chat_blocked' ? (
                      <button
                        type="button"
                        onClick={() =>
                          handleAction(
                            () => unblockChat(selectedUser.userId, selectedUser.role),
                            'Blokir Chat dibatalkan.'
                          )
                        }
                        className="py-1 px-2 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 rounded text-xs font-semibold"
                      >
                        Buka Chat
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <select
                          title="Durasi Blokir Chat"
                          aria-label="Durasi Blokir Chat"
                          value={blockMinutes}
                          onChange={(e) => setBlockMinutes(Number(e.target.value))}
                          className="moderation-select text-xs"
                        >
                          <option value={5}>5 Menit</option>
                          <option value={15}>15 Menit</option>
                          <option value={60}>1 Jam</option>
                          <option value={1440}>24 Jam</option>
                          <option value={0}>Permanen</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            handleAction(
                              () => blockChat(selectedUser.userId, selectedUser.role, blockMinutes),
                              'Chat berhasil diblokir.'
                            )
                          }
                          className="py-1 px-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-all"
                        >
                          Blokir Chat
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Kick Action */}
                {canPerformAction(actorRole, 'KICK_USER') && (
                  <div className="border border-white/5 rounded-lg p-2.5 bg-black/20 flex flex-col justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <UserMinus className="h-3.5 w-3.5" /> Kick User
                      </span>
                      <span className="text-[10px] text-slate-500 leading-tight">
                        Keluarkan user paksa dari room. User bisa join kembali.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleAction(
                          () => kickUser(selectedUser.userId, selectedUser.role),
                          'User berhasil dikick.'
                        )
                      }
                      className="py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-all w-full mt-1"
                    >
                      Kick User
                    </button>
                  </div>
                )}
              </div>

              {/* Ban Action */}
              {canPerformAction(actorRole, 'BAN_USER') && (
                <div className="border border-red-500/10 rounded-lg p-3 bg-red-950/10 flex flex-col gap-2 mt-1">
                  <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4" /> Banned Dari Channel
                  </span>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Masukkan alasan ban..."
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      className="moderation-input text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleAction(
                          () => banUser(selectedUser.userId, selectedUser.role, banReason, 0),
                          'User berhasil di-ban secara permanen.'
                        )
                      }
                      className="py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserX className="h-3.5 w-3.5" /> Ban User Permanen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
