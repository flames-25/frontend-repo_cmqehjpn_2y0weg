import { useEffect, useMemo, useState } from 'react'

function App() {
  const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

  const [todos, setTodos] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [filter, setFilter] = useState('all') // all | active | completed
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    if (filter === 'active') return todos.filter(t => !t.completed)
    if (filter === 'completed') return todos.filter(t => t.completed)
    return todos
  }, [todos, filter])

  const remaining = useMemo(() => todos.filter(t => !t.completed).length, [todos])

  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/todos`)
      if (!res.ok) throw new Error('Failed to load todos')
      const data = await res.json()
      setTodos(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const addTodo = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() })
      })
      if (!res.ok) throw new Error('Failed to add todo')
      const created = await res.json()
      setTodos(prev => [created, ...prev])
      setNewTitle('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleTodo = async (id, completed) => {
    setError('')
    try {
      // optimistic update
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t))

      const res = await fetch(`${API_BASE}/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
      if (!res.ok) throw new Error('Failed to update todo')
    } catch (e) {
      setError(e.message)
      // revert on error
      setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t))
    }
  }

  const renameTodo = async (id, title) => {
    if (!title.trim()) return
    setError('')
    try {
      // optimistic
      setTodos(prev => prev.map(t => t.id === id ? { ...t, title: title.trim() } : t))
      const res = await fetch(`${API_BASE}/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() })
      })
      if (!res.ok) throw new Error('Failed to rename todo')
    } catch (e) {
      setError(e.message)
      fetchTodos()
    }
  }

  const deleteTodo = async (id) => {
    setError('')
    try {
      // optimistic
      const prev = todos
      setTodos(prev => prev.filter(t => t.id !== id))
      const res = await fetch(`${API_BASE}/api/todos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete todo')
    } catch (e) {
      setError(e.message)
      fetchTodos()
    }
  }

  const clearCompleted = async () => {
    const completedTodos = todos.filter(t => t.completed)
    if (completedTodos.length === 0) return
    setError('')

    // Optimistic remove
    const toDelete = completedTodos.map(t => t.id)
    const prev = todos
    setTodos(prev.filter(t => !t.completed))

    try {
      await Promise.all(
        toDelete.map(id => fetch(`${API_BASE}/api/todos/${id}`, { method: 'DELETE' }))
      )
    } catch (e) {
      setError('Failed to clear completed')
      setTodos(prev) // revert
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-sky-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Todo List</h1>
          <p className="text-gray-600 mt-2">Add tasks, mark them done, filter, and manage your list.</p>
        </header>

        <form onSubmit={addTodo} className="flex gap-2 mb-6">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !newTitle.trim()}
            className="rounded-md bg-indigo-600 px-5 py-3 text-white font-semibold shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">{remaining} item{remaining !== 1 ? 's' : ''} left</div>
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded border ${filter==='all' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>All</button>
            <button onClick={() => setFilter('active')} className={`px-3 py-1 rounded border ${filter==='active' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>Active</button>
            <button onClick={() => setFilter('completed')} className={`px-3 py-1 rounded border ${filter==='completed' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>Completed</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {loading && todos.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No tasks here. Add one above!</div>
          ) : (
            filtered.map(todo => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onToggle={(checked) => toggleTodo(todo.id, checked)}
                onRename={(title) => renameTodo(todo.id, title)}
                onDelete={() => deleteTodo(todo.id)}
              />
            ))
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button onClick={clearCompleted} className="text-sm text-gray-600 hover:text-gray-900">
            Clear completed
          </button>
          <a href="/test" className="text-sm text-indigo-600 hover:underline">Check backend status</a>
        </div>
      </div>
    </div>
  )
}

function TodoRow({ todo, onToggle, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(todo.title)

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      onRename(title)
      setEditing(false)
    } else if (e.key === 'Escape') {
      setTitle(todo.title)
      setEditing(false)
    }
  }

  useEffect(() => setTitle(todo.title), [todo.title])

  return (
    <div className="flex items-center gap-3 p-4">
      <input
        type="checkbox"
        checked={!!todo.completed}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />

      {editing ? (
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { setEditing(false); setTitle(todo.title) }}
          autoFocus
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={`flex-1 text-left ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'} hover:underline`}
        >
          {todo.title}
        </button>
      )}

      <button
        onClick={onDelete}
        className="text-red-600 hover:text-red-700 text-sm font-medium"
      >
        Delete
      </button>
    </div>
  )
}

export default App
