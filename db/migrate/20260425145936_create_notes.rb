class CreateNotes < ActiveRecord::Migration[7.2]
  def change
    create_table :notes do |t|
      t.text :content, null: false
      t.decimal :latitude, precision: 10, scale: 6, null: false
      t.decimal :longitude, precision: 10, scale: 6, null: false
      t.datetime :expires_at, null: true
      t.integer :max_views, null: true
      t.integer :views_count, default: 0, null: false
      t.references :user, foreign_key: true, null: false
      t.integer :visibility, default: 0, null: false
      t.string :language

      t.index [:latitude, :longitude]
      t.index :longitude
      t.index :language
      
      t.timestamps
    end
  end
end
