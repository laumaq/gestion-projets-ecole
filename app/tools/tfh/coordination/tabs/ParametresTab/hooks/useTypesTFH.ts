// app/tools/tfh/coordination/tabs/ParametresTab/hooks/useTypesTFH.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TypeTFH {
  id: string;
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

export function useTypesTFH() {
  const [types, setTypes] = useState<TypeTFH[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      // Récupérer tous les types depuis tfh_system_settings
      const { data, error } = await supabase
        .from('tfh_system_settings')
        .select('*')
        .like('setting_key', 'tfh_type_%')
        .order('setting_key');

      if (error) throw error;

      // Extraire les types des clés
      const typesMap: Record<string, TypeTFH> = {};
      
      (data || []).forEach(item => {
        const match = item.setting_key.match(/tfh_type_([^_]+)_(label|description|icon|color)/);
        if (match) {
          const key = match[1];
          const field = match[2];
          
          if (!typesMap[key]) {
            typesMap[key] = {
              id: key,
              key: key,
              label: key.charAt(0).toUpperCase() + key.slice(1),
              description: '',
              icon: '',
              color: 'bg-gray-100 text-gray-700 border-gray-200'
            };
          }
          
          if (field === 'label') typesMap[key].label = item.setting_value;
          else if (field === 'description') typesMap[key].description = item.setting_value;
          else if (field === 'icon') typesMap[key].icon = item.setting_value;
          else if (field === 'color') typesMap[key].color = item.setting_value;
        }
      });

      // Si aucun type n'existe, créer les types par défaut
      if (Object.keys(typesMap).length === 0) {
        const defaultTypes = [
          { key: 'memoire', label: 'Mémoire', icon: 'BookOpen', color: 'bg-blue-100 text-blue-800 border-blue-200' },
          { key: 'associatif', label: 'Associatif', icon: 'Users', color: 'bg-green-100 text-green-800 border-green-200' },
          { key: 'artistique', label: 'Artistique', icon: 'Palette', color: 'bg-purple-100 text-purple-800 border-purple-200' },
          { key: 'atelier', label: 'Atelier', icon: 'Hammer', color: 'bg-orange-100 text-orange-800 border-orange-200' },
        ];
        
        defaultTypes.forEach(t => {
          typesMap[t.key] = {
            id: t.key,
            key: t.key,
            label: t.label,
            description: '',
            icon: t.icon,
            color: t.color
          };
        });
      }

      setTypes(Object.values(typesMap));
    } catch (err) {
      console.error('Erreur chargement types:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveType = async (type: TypeTFH) => {
    setSaving(true);
    try {
      const updates = [
        { setting_key: `tfh_type_${type.key}_label`, setting_value: type.label, description: `Label du type ${type.key}` },
        { setting_key: `tfh_type_${type.key}_description`, setting_value: type.description, description: `Description du type ${type.key}` },
        { setting_key: `tfh_type_${type.key}_icon`, setting_value: type.icon, description: `Icône du type ${type.key}` },
        { setting_key: `tfh_type_${type.key}_color`, setting_value: type.color, description: `Couleur du type ${type.key}` },
      ];

      const { error } = await supabase
        .from('tfh_system_settings')
        .upsert(updates, { onConflict: 'setting_key' });

      if (error) throw error;

      setTypes(prev => prev.map(t => t.key === type.key ? type : t));
      return true;
    } catch (err) {
      console.error('Erreur sauvegarde type:', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addType = async (typeKey: string, typeLabel: string) => {
    setSaving(true);
    try {
      const newType: TypeTFH = {
        id: typeKey,
        key: typeKey,
        label: typeLabel,
        description: '',
        icon: 'BookOpen',
        color: 'bg-gray-100 text-gray-700 border-gray-200'
      };

      const success = await saveType(newType);
      if (success) {
        setTypes(prev => [...prev, newType]);
      }
      return success;
    } catch (err) {
      console.error('Erreur ajout type:', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (typeKey: string) => {
    setSaving(true);
    try {
      const keys = [
        `tfh_type_${typeKey}_label`,
        `tfh_type_${typeKey}_description`,
        `tfh_type_${typeKey}_icon`,
        `tfh_type_${typeKey}_color`
      ];

      const { error } = await supabase
        .from('tfh_system_settings')
        .delete()
        .in('setting_key', keys);

      if (error) throw error;

      setTypes(prev => prev.filter(t => t.key !== typeKey));
      return true;
    } catch (err) {
      console.error('Erreur suppression type:', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadTypes();
  }, [loadTypes]);

  return {
    types,
    loading,
    saving,
    loadTypes,
    saveType,
    addType,
    deleteType
  };
}