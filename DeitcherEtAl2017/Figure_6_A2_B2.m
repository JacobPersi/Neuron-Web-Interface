% Requires TREES toolbox
function [] = Figure_6_A2_B2()
close all

LABEL_FONT_SIZE = 20;
FONT_SIZE = 18;
tree = load_tree('Morphs_and_trees/1148.neu');


% set passive parameters

SPINES_START = 60;

Tau = 14.94218038;
Cm = 0.5;

RM = Tau/Cm*1000;
Gm  =1/RM;
Ri = 200;

T_terminals=T_tree(tree); %find terminals of the tree
terminals=  find(T_terminals); % now terminals is the indices of the dendrite terminals in tree
%
routes= ipar_tree(tree); %create mat of all the routes in tree - each row is the route from 0 to each node in the tree

fig1=figure(1);

ri =rindex_tree(tree);% split the tree to the soma/ apic and dend
one_idx = find(ri<=1);

soma = create_sub_tree(tree,1,one_idx(2)-1);
basal = create_sub_tree(tree,one_idx(2),one_idx(3)-1);
apic = create_sub_tree(tree,one_idx(3),length(ri));
soma_basal = create_sub_tree(tree,1,one_idx(3)-1);

colorArr = [1 0 0; 0 0 1]; % 1st color for basal , 2nd for apical

% first dedrogram by length
dendrogram_tree_basal_apical(soma_basal,apic,1.5,[],[],colorArr)
t=ylabel('Physical length (\mum)');
set(t,'FontSize',LABEL_FONT_SIZE)
t=xlabel('Terminal number');
set(t,'FontSize',LABEL_FONT_SIZE)
set(gca,'FontSize',FONT_SIZE);
set(gca,'Box','on')
set(gca,'LineWidth',2)
set(gca,'linewidth',1)

axis([-1 79 0 1400])
set(gca,'xtick',[-1:20:79])
set(gca,'xticklabels',{'0';'20';'40';'60';'80'})


pos = [1   1   7*3  6*3];
set(gcf,'units','centimeters','position',pos)

figure(3)

F_basal = 1.9;
F_apic = 1.9;



seg_length = Pvec_tree(tree,len_tree(tree));
apic_seg_length = Pvec_tree(apic,len_tree(apic))+seg_length(one_idx(3));
soma_basal_seg_length = Pvec_tree(soma_basal,len_tree(soma_basal));


for i=1:length(ri)
    tree.Gm(i) = Gm;
    tree.Ri(i) =Ri;
    tree.Cm(i) = Cm;
end


%  add the spines to the apical and basal where dist >
for i=1:length(apic.R)
    
    if (apic_seg_length(i)>SPINES_START)
        apic.Gm(i) = Gm*F_apic;
        apic.Ri(i) =Ri;
        apic.Cm(i) = Cm*F_apic;
        
       
    else
        apic.Gm(i) = Gm;
        apic.Ri(i) =Ri;
        apic.Cm(i) = Cm;
    end
end

tree.Gm(one_idx(3):end) = apic.Gm;
tree.Cm(one_idx(3):end) = apic.Gm;

for i=1:length(soma_basal.R)
    
    if (soma_basal_seg_length(i)>SPINES_START)
        soma_basal.Gm(i) = Gm*F_basal;
        soma_basal.Ri(i) =Ri;
        soma_basal.Cm(i) = Cm*F_basal;
    else
        soma_basal.Gm(i) = Gm;
        soma_basal.Ri(i) =Ri;
        soma_basal.Cm(i) = Cm;
    end
end
tree.Gm(1:one_idx(3)-1) = soma_basal.Gm;
tree.Cm(1:one_idx(3)-1) = soma_basal.Gm;

soma_basal.Gm = soma_basal.Gm';
soma_basal.Ri = soma_basal.Ri';

apic.Gm = apic.Gm';
apic.Ri = apic.Ri';

tree.Gm = tree.Gm';
tree.Ri = tree.Ri';

L_all = Pvec_tree(tree,elen_tree(tree));
L_apic = Pvec_tree(apic,elen_tree(apic))+ L_all(one_idx(3));
L_basal = Pvec_tree(soma_basal,elen_tree(soma_basal));


dendrogram_tree_basal_apical(soma_basal,apic,1.5,L_basal,L_apic,colorArr);

T_terminals=T_tree(tree); %find ends of the tree
terminals=  find(T_terminals); % now ends is the indices of the dendrite ends in tree


XLim = xlim;
YLim = ylim;

axis([-1,79,0,2.5])
set(gca,'xtick',[-1:20:79])
set(gca,'xticklabels',{'0';'20';'40';'60';'80'})


t=ylabel('Cable length');
set(t,'FontSize',LABEL_FONT_SIZE)
t=xlabel('Terminal number');
set(t,'FontSize',LABEL_FONT_SIZE)
set(gca,'FontSize',FONT_SIZE);
set(gca,'Box','on')
set(gca,'LineWidth',2)
set(gca,'linewidth',1)


pos = [1   2   7*3  6*3];
set(gcf,'units','centimeters','position',pos)

end
function sub_tree = create_sub_tree(tree,ix_st,ix_en)
sub_tree.dA = tree.dA(ix_st:ix_en,ix_st:ix_en);
sub_tree.X = tree.X(ix_st:ix_en);
sub_tree.Y = tree.Y(ix_st:ix_en);
sub_tree.Z = tree.Z(ix_st:ix_en);
sub_tree.D = tree.D(ix_st:ix_en);
sub_tree.R = tree.R(ix_st:ix_en);

end