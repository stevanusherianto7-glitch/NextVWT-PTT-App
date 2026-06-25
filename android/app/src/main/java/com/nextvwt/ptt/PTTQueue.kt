package com.nextvwt.ptt

import java.util.PriorityQueue
import java.util.Collections

object PTTQueue {
    enum class UserRole(val priorityWeight: Int) {
        EMERGENCY_OVERRIDE(0),
        OWNER(1),
        ADMIN(2),
        OPERATOR(3),
        VERIFIED_MEMBER(4),
        GUEST(5)
    }

    data class PTTRequest(
        val userId: String,
        val role: UserRole,
        val timestamp: Long = System.currentTimeMillis()
    ) : Comparable<PTTRequest> {
        override fun compareTo(other: PTTRequest): Int {
            // Urutkan berdasarkan bobot prioritas peran, jika sama urutkan berdasarkan waktu request terdahulu
            return if (this.role.priorityWeight != other.role.priorityWeight) {
                this.role.priorityWeight.compareTo(other.role.priorityWeight)
            } else {
                this.timestamp.compareTo(other.timestamp)
            }
        }
    }

    private val queue = PriorityQueue<PTTRequest>()
    private var activeSpeakerId: String? = null

    @Synchronized
    fun requestPTT(userId: String, role: UserRole, onFloorGranted: () -> Unit, onFloorQueued: (position: Int) -> Unit) {
        val request = PTTRequest(userId, role)

        if (role == UserRole.EMERGENCY_OVERRIDE) {
            interuptActiveSpeaker(request)
            onFloorGranted()
            return
        }

        if (activeSpeakerId == null) {
            activeSpeakerId = userId
            onFloorGranted()
        } else {
            if (!queue.any { it.userId == userId }) {
                queue.add(request)
            }
            val position = queue.toList().sorted().indexOf(request) + 1
            onFloorQueued(position)
        }
    }

    @Synchronized
    fun releasePTT(userId: String, onNextSpeakerGranted: (String) -> Unit, onChannelFree: () -> Unit) {
        if (activeSpeakerId == userId) {
            activeSpeakerId = null
            val nextRequest = queue.poll()
            if (nextRequest != null) {
                activeSpeakerId = nextRequest.userId
                onNextSpeakerGranted(nextRequest.userId)
            } else {
                onChannelFree()
            }
        }
    }

    private fun interuptActiveSpeaker(request: PTTRequest) {
        // Logika menghentikan paksa streaming active speaker lama via signal MQTT
        activeSpeakerId = request.userId
        queue.clear() // Clear antrean non-darurat demi efisiensi jalur emergency
    }

    @Synchronized
    fun clearQueue() {
        queue.clear()
        activeSpeakerId = null
    }
}
