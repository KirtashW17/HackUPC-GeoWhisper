class AddArchivedToNotes < ActiveRecord::Migration[7.2]
  def change
    add_column :notes, :archived, :boolean, default: false, null: false
  end
end
