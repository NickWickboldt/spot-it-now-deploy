import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';

// Tool Card Component
const ToolCard = ({ 
  title, 
  description, 
  icon, 
  iconFamily = 'fa',
  color = Colors.light.primaryGreen,
  onPress, 
  disabled = false,
  badge
}: { 
  title: string; 
  description: string; 
  icon: string;
  iconFamily?: 'fa' | 'fa5';
  color?: string;
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
}) => {
  const IconComponent = iconFamily === 'fa5' ? Icon5 : Icon;
  
  return (
    <TouchableOpacity 
      style={[styles.toolCard, disabled && styles.toolCardDisabled]} 
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.toolIconContainer, { backgroundColor: `${color}15` }]}>
        <IconComponent name={icon} size={22} color={disabled ? Colors.light.darkNeutral : color} />
      </View>
      <View style={styles.toolContent}>
        <View style={styles.toolTitleRow}>
          <Text style={[styles.toolTitle, disabled && styles.toolTitleDisabled]}>{title}</Text>
          {badge && (
            <View style={[styles.toolBadge, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.toolBadgeText, { color }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.toolDescription}>{description}</Text>
      </View>
      <Icon name="chevron-right" size={14} color={disabled ? '#ccc' : Colors.light.darkNeutral} style={{ opacity: 0.5 }} />
    </TouchableOpacity>
  );
};

// Section Header Component
const SectionHeader = ({ title, icon }: { title: string; icon: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconWrap}>
      <Icon name={icon} size={12} color={Colors.light.primaryGreen} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

export default function AdminHome(): React.JSX.Element {
  const { user } = useAuth();
  const router = useRouter();

  // Gate access: redirect non-admins away
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [user]);

  if (!user) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primaryGreen} />
      </View>
    );
  }

  if (user.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <View style={styles.deniedCard}>
          <Icon name="lock" size={32} color="#ef4444" />
          <Text style={styles.deniedTitle}>Access Denied</Text>
          <Text style={styles.deniedText}>You don't have permission to access this area</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={['#40743dff', '#5a9a55', '#7FA37C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrap}>
            <Icon5 name="shield-alt" size={24} color="#fff" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Admin Dashboard</Text>
            <Text style={styles.headerSubtitle}>Moderation & Data Management</Text>
          </View>
        </View>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="user" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statLabel}>Logged in as</Text>
            <Text style={styles.statValue}>{user.username}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Icon5 name="user-shield" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statLabel}>Role</Text>
            <Text style={styles.statValue}>Administrator</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Management Section */}
        <SectionHeader title="User Management" icon="users" />
        <ToolCard
          title="Manage Users"
          description="View, edit, and moderate user accounts"
          icon="users"
          color="#3B82F6"
          onPress={() => router.push('/manage-users')}
        />

        {/* Content Management Section */}
        <SectionHeader title="Content Management" icon="image" />
        <ToolCard
          title="Manage Sightings"
          description="Review and curate animal sighting reports"
          icon="map-marker"
          color="#10B981"
          onPress={() => router.push('/manage-sightings')}
        />
        <ToolCard
          title="Manage Challenges"
          description="Create and manage location-based challenges"
          icon="trophy"
          color="#F59E0B"
          onPress={() => router.push('/(admin)/manage-challenges')}
        />

        {/* Database Section */}
        <SectionHeader title="Database Tools" icon="database" />
        <ToolCard
          title="Populate Animal DB"
          description="Create and seed animal entries in bulk"
          icon="database"
          iconFamily="fa5"
          color="#8B5CF6"
          onPress={() => router.push('/(admin)/add-animal')}
        />
        <ToolCard
          title="Add & Link Animals"
          description="Map AI labels to animals or create new entries"
          icon="link"
          color="#EC4899"
          onPress={() => router.push('/(admin)/add-and-link')}
          badge="AI"
        />

        {/* Coming Soon Section */}
        <SectionHeader title="Coming Soon" icon="clock-o" />
        <ToolCard
          title="Analytics Dashboard"
          description="View app usage statistics and trends"
          icon="chart-line"
          iconFamily="fa5"
          disabled
        />
        <ToolCard
          title="System Settings"
          description="Configure app-wide settings and features"
          icon="cogs"
          disabled
        />

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.light.softBeige,
  },
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.light.softBeige,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 0) + 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#fff',
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: `${Colors.light.primaryGreen}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.darkNeutral,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  toolCardDisabled: {
    opacity: 0.6,
  },
  toolIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  toolContent: {
    flex: 1,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.mainText,
  },
  toolTitleDisabled: {
    color: Colors.light.darkNeutral,
  },
  toolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  toolBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  toolDescription: {
    fontSize: 13,
    color: Colors.light.darkNeutral,
    marginTop: 3,
  },
  deniedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginHorizontal: 32,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
    marginTop: 16,
  },
  deniedText: {
    fontSize: 14,
    color: Colors.light.darkNeutral,
    textAlign: 'center',
    marginTop: 8,
  },
});
