<template>
  <Teleport to="body">
    <div v-if="confirmVisible" class="modal-overlay" @click.self="hideConfirmModal">
      <div class="modal-card">
        <p>{{ confirmMessage }}</p>
        <div class="modal-actions">
          <button class="modal-btn cancel" @click="hideConfirmModal">取消</button>
          <button class="modal-btn confirm" @click="handleConfirm">确认删除</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useConfirmModal } from '@/composables/useConfirmModal'

const { confirmVisible, confirmMessage, hideConfirmModal, handleConfirm } = useConfirmModal()
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  animation: fadeIn 0.15s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px 32px;
  max-width: 360px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.2s ease forwards;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-card p {
  font-size: 15px;
  color: #44403c;
  margin-bottom: 24px;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.modal-btn {
  padding: 10px 28px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.modal-btn.cancel {
  background: #f0efed;
  color: #78716c;
}

.modal-btn.cancel:hover {
  background: #e7e5e4;
}

.modal-btn.confirm {
  background: #ef4444;
  color: #fff;
}

.modal-btn.confirm:hover {
  background: #dc2626;
}
</style>
