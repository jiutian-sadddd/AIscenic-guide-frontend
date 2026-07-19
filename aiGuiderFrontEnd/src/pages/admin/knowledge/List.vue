<template>
  <div class="knowledge-page">
    <!-- 操作栏 -->
    <div class="knowledge-toolbar">
      <div class="knowledge-toolbar__left">
        <el-select
          v-model="filterCategory"
          placeholder="分类筛选"
          clearable
          style="width: 160px"
          @change="fetchList"
        >
          <el-option
            v-for="cat in categories"
            :key="cat.key"
            :label="cat.label"
            :value="cat.key"
          />
        </el-select>
        <el-input
          v-model="filterKeyword"
          placeholder="搜索文档…"
          clearable
          style="width: 240px"
          @keydown.enter="fetchList"
          @clear="fetchList"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="knowledge-toolbar__right">
        <el-button type="primary" @click="openCreateDialog">
          <el-icon style="margin-right: 4px"><Plus /></el-icon>
          上传文档
        </el-button>
      </div>
    </div>

    <!-- 文档表格 -->
    <el-card shadow="never">
      <el-table
        :data="docList"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="viewDetail(row)">{{ row.title }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ categoryLabel(row.category) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ row.status === 'published' ? '已发布' : row.status === 'draft' ? '草稿' : '已归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="vector_status" label="向量化" width="100">
          <template #default="{ row }">
            <el-tag :type="vectorStatusType(row.vector_status)" size="small">
              {{ vectorStatusLabel(row.vector_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="tags" label="标签" width="180">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags"
              :key="tag"
              size="small"
              type="info"
              style="margin-right: 4px"
            >
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.updated_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="syncVector(row)">同步</el-button>
            <el-popconfirm title="确定删除该文档？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="knowledge-pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="size"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="fetchList"
          @size-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 创建/编辑文档对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑文档' : '上传文档'"
      :width="isMobile ? '95%' : '680px'"
      destroy-on-close
    >
      <el-form :model="docForm" label-width="80px">
        <el-form-item label="标题" required>
          <el-input v-model="docForm.title" placeholder="请输入文档标题" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="docForm.category" placeholder="请选择分类">
            <el-option
              v-for="cat in categories"
              :key="cat.key"
              :label="cat.label"
              :value="cat.key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="docForm.tags"
            multiple
            filterable
            allow-create
            placeholder="输入标签后回车"
          />
        </el-form-item>
        <el-form-item label="内容">
          <!--
            Markdown 编辑器预留接口
            当前使用 el-input textarea，集成时可替换为：
            - @kangc/v-md-editor
            - milkdown
            - tiptap
          -->
          <el-input
            v-model="docForm.content"
            type="textarea"
            :rows="10"
            placeholder="支持 Markdown 格式…"
          />
        </el-form-item>
        <el-form-item v-if="!isEditing" label="上传文件">
          <el-upload
            :auto-upload="false"
            :on-change="onFileChange"
            :limit="1"
            accept=".pdf,.docx,.txt,.xlsx"
          >
            <el-button type="primary" plain>选择文件 (PDF/DOCX/TXT)</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 PDF、DOCX、TXT、Excel 格式，单文件不超过 50MB</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEditing ? '保存修改' : '上传' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 文档详情抽屉 -->
    <el-drawer
      v-model="detailVisible"
      title="文档详情"
      :size="isMobile ? '90%' : '600px'"
    >
      <template v-if="currentDoc">
        <div class="doc-detail">
          <h2>{{ currentDoc.title }}</h2>
          <div class="doc-detail__meta">
            <el-tag size="small">{{ categoryLabel(currentDoc.category) }}</el-tag>
            <span class="doc-detail__date">更新于 {{ formatDate(currentDoc.updated_at) }}</span>
          </div>
          <div class="doc-detail__content" v-html="renderMarkdown(currentDoc.content || currentDoc.content_snippet || '')" />
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Plus } from '@element-plus/icons-vue'
import { marked } from 'marked'
import * as knowledgeApi from '@/api/knowledge'
import type { KnowledgeDoc, DocCategory, CategoryStat } from '@/types/api.types'

// ==================== 响应式检测 ====================
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)

function onResize() {
  windowWidth.value = window.innerWidth
}

// ==================== 列表状态 ====================
const docList = ref<KnowledgeDoc[]>([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const loading = ref(false)
const filterCategory = ref<DocCategory | ''>('')
const filterKeyword = ref('')

// ==================== 分类 ====================
const categories = ref<CategoryStat[]>([
  { key: 'history', label: '历史文化', count: 0 },
  { key: 'culture', label: '人文艺术', count: 0 },
  { key: 'faq', label: '常见问题', count: 0 },
  { key: 'notice', label: '游览须知', count: 0 },
])

// ==================== 对话框 ====================
const dialogVisible = ref(false)
const isEditing = ref(false)
const submitting = ref(false)
const editingId = ref('')
const selectedFile = ref<File | null>(null)

const docForm = ref({
  title: '',
  category: '' as DocCategory | '',
  content: '',
  tags: [] as string[],
})

// ==================== 详情抽屉 ====================
const detailVisible = ref(false)
const currentDoc = ref<KnowledgeDoc | null>(null)

// ==================== 初始化 ====================
onMounted(() => {
  window.addEventListener('resize', onResize)
  fetchCategories()
  fetchList()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

async function fetchCategories() {
  try {
    const { data } = await knowledgeApi.getCategories()
    categories.value = data.data
  } catch {
    // 使用默认分类
  }
}

async function fetchList() {
  loading.value = true
  try {
    const { data } = await knowledgeApi.getDocList({
      page: page.value,
      size: size.value,
      category: filterCategory.value || undefined,
      keyword: filterKeyword.value || undefined,
    })
    docList.value = data.data.items
    total.value = data.data.total
  } catch {
    // Mock 数据兜底
    docList.value = getMockDocs()
    total.value = docList.value.length
  } finally {
    loading.value = false
  }
}

// ==================== 创建/编辑 ====================
function openCreateDialog() {
  isEditing.value = false
  editingId.value = ''
  docForm.value = { title: '', category: '', content: '', tags: [] }
  selectedFile.value = null
  dialogVisible.value = true
}

function openEditDialog(doc: KnowledgeDoc) {
  isEditing.value = true
  editingId.value = doc.id
  docForm.value = {
    title: doc.title,
    category: doc.category,
    content: doc.content || '',
    tags: [...doc.tags],
  }
  dialogVisible.value = true
}

function onFileChange(file: { raw: File }) {
  selectedFile.value = file.raw
}

async function handleSubmit() {
  if (!docForm.value.title || !docForm.value.category) {
    ElMessage.warning('请填写标题和分类')
    return
  }

  submitting.value = true
  try {
    if (isEditing.value) {
      await knowledgeApi.updateDoc(editingId.value, {
        title: docForm.value.title,
        category: docForm.value.category as DocCategory,
        content: docForm.value.content,
        tags: docForm.value.tags,
      })
      ElMessage.success('更新成功')
    } else {
      await knowledgeApi.createDoc({
        title: docForm.value.title,
        category: docForm.value.category as DocCategory,
        content: docForm.value.content || undefined,
        file: selectedFile.value || undefined,
        tags: docForm.value.tags,
      })
      ElMessage.success('上传成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    ElMessage.error(isEditing.value ? '更新失败' : '上传失败')
  } finally {
    submitting.value = false
  }
}

// ==================== 删除 ====================
async function handleDelete(id: string) {
  try {
    await knowledgeApi.deleteDoc(id)
    ElMessage.success('删除成功')
    fetchList()
  } catch {
    ElMessage.error('删除失败')
  }
}

// ==================== 同步 ====================
async function syncVector(doc: KnowledgeDoc) {
  try {
    await knowledgeApi.syncDocVector(doc.id)
    ElMessage.success('向量同步已触发')
  } catch {
    ElMessage.error('同步失败')
  }
}

// ==================== 详情 ====================
function viewDetail(doc: KnowledgeDoc) {
  currentDoc.value = doc
  detailVisible.value = true
}

// ==================== 工具 ====================
function categoryLabel(key: string): string {
  return categories.value.find((c) => c.key === key)?.label || key
}

function statusType(status: string) {
  return status === 'published' ? 'success' : status === 'draft' ? 'info' : 'warning'
}

function vectorStatusType(status: string) {
  const map: Record<string, string> = { synced: 'success', syncing: 'warning', pending: 'info', failed: 'danger' }
  return map[status] || 'info'
}

function vectorStatusLabel(status: string) {
  const map: Record<string, string> = { synced: '已同步', syncing: '同步中', pending: '待同步', failed: '失败' }
  return map[status] || status
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('zh-CN')
}

function renderMarkdown(text: string): string {
  if (!text) return '<p>暂无内容</p>'
  return marked.parse(text, { breaks: true }) as string
}

// ==================== Mock 数据 ====================
function getMockDocs(): KnowledgeDoc[] {
  return [
    {
      id: '1', title: '灵山大佛历史沿革', category: 'history',
      content_snippet: '灵山大佛始建于1994年…', status: 'published',
      vector_status: 'synced', tags: ['灵山大佛', '历史'],
      created_at: '2026-05-01T10:00:00Z', updated_at: '2026-06-01T10:00:00Z',
    },
    {
      id: '2', title: '九龙灌浴表演时间表', category: 'notice',
      content_snippet: '每日表演时间：10:00, 14:00…', status: 'published',
      vector_status: 'synced', tags: ['表演', '时间'],
      created_at: '2026-05-02T10:00:00Z', updated_at: '2026-06-02T10:00:00Z',
    },
    {
      id: '3', title: '梵宫建筑艺术介绍', category: 'culture',
      content_snippet: '梵宫是灵山胜境的核心建筑之一…', status: 'published',
      vector_status: 'synced', tags: ['梵宫', '建筑', '艺术'],
      created_at: '2026-05-03T10:00:00Z', updated_at: '2026-06-03T10:00:00Z',
    },
    {
      id: '4', title: '景区常见问题 FAQ', category: 'faq',
      content_snippet: '门票价格、开放时间、交通指南…', status: 'published',
      vector_status: 'pending', tags: ['FAQ', '常见问题'],
      created_at: '2026-05-04T10:00:00Z', updated_at: '2026-06-04T10:00:00Z',
    },
  ]
}
</script>

<style scoped lang="scss">
.knowledge-page {
  display: flex;
  flex-direction: column;
  gap: 16px;

  // 移动端表格横向滚动
  :deep(.el-card__body) {
    @media (max-width: 768px) {
      padding: 12px 8px;
      overflow-x: auto;
    }
  }
}

.knowledge-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;

  &__left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__right {
    flex-shrink: 0;
  }
}

// 移动端工具栏适配
@media (max-width: 640px) {
  .knowledge-toolbar {
    flex-direction: column;
    align-items: stretch;

    &__left {
      flex-direction: column;
      align-items: stretch;

      :deep(.el-select),
      :deep(.el-input) {
        width: 100% !important;
      }
    }

    &__right {
      :deep(.el-button) {
        width: 100%;
      }
    }
  }
}

.knowledge-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.doc-detail {
  h2 {
    font-size: 22px;
    color: #333;
    margin-bottom: 12px;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #eee;
  }

  &__date {
    font-size: 13px;
    color: #999;
  }

  &__content {
    line-height: 1.8;
    font-size: 15px;
    color: #333;

    :deep(h1), :deep(h2), :deep(h3) {
      margin: 16px 0 8px;
      color: #333;
    }

    :deep(p) {
      margin-bottom: 12px;
    }

    :deep(ul), :deep(ol) {
      padding-left: 20px;
      margin-bottom: 12px;
    }

    :deep(code) {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }

    :deep(pre) {
      background: #f5f5f5;
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 12px;
    }
  }
}
</style>
