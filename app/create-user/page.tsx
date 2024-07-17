import CreateUserForm from "../../components/CreateUserForm";


export default function CreateUserPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New User</h1>
      <CreateUserForm />
    </div>
  )
}